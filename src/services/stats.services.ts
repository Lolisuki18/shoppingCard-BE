import { Prisma } from '@prisma/client'
import databaseService from './database.services'
import { OrderStatus } from '@prisma/client'
import HTTP_STATUS from '~/constants/httpStatus'
import { STATS_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { LowStockQuery, RevenueQuery, StatsRangeQuery, TopProductsQuery } from '~/models/requests/Shop.requests'
import { buildPage, getPagination } from '~/utils/pagination'

//doanh thu = tổng total_amount của đơn đã giao (Delivered), tính theo ngày tạo đơn
//ngày/tháng được cắt theo giờ Việt Nam (DB lưu UTC)
const TIME_ZONE = 'Asia/Ho_Chi_Minh'
const DAY_MS = 24 * 60 * 60 * 1000

//khoảng thời gian dạng [from, to): bỏ trống thì không giới hạn phía đó
const dateRange = ({ from, to }: StatsRangeQuery): Prisma.DateTimeFilter | undefined =>
  from || to ? { ...(from && { gte: from }), ...(to && { lt: to }) } : undefined

class StatsServices {
  //số liệu tổng quan: đơn/doanh thu/khách mới theo khoảng thời gian; sản phẩm là số liệu hiện tại
  async overview(query: StatsRangeQuery) {
    const created_at = dateRange(query)
    const orderWhere: Prisma.OrderWhereInput = { ...(created_at && { created_at }) }
    const [byStatus, delivered, newUsers, totalUsers, totalProducts, activeProducts] = await Promise.all([
      databaseService.orders.groupBy({ by: ['status'], where: orderWhere, _count: { _all: true } }),
      databaseService.orders.aggregate({
        where: { ...orderWhere, status: 'Delivered' },
        _sum: { total_amount: true, discount_amount: true }
      }),
      databaseService.users.count({ where: { ...(created_at && { created_at }) } }),
      databaseService.users.count(),
      databaseService.products.count(),
      databaseService.products.count({ where: { is_active: true } })
    ])
    //luôn trả đủ mọi trạng thái (0 nếu không có) để FE khỏi phải tự điền
    const orders_by_status = Object.fromEntries(Object.values(OrderStatus).map((status) => [status, 0])) as Record<
      OrderStatus,
      number
    >
    for (const row of byStatus) orders_by_status[row.status] = row._count._all
    const deliveredCount = orders_by_status.Delivered
    const revenue = delivered._sum.total_amount ?? 0
    return {
      revenue,
      discount_total: delivered._sum.discount_amount ?? 0,
      average_order_value: deliveredCount === 0 ? 0 : Math.round(revenue / deliveredCount),
      orders_total: Object.values(orders_by_status).reduce((sum, n) => sum + n, 0),
      orders_by_status,
      new_users: newUsers,
      users_total: totalUsers,
      products_total: totalProducts,
      products_active: activeProducts
    }
  }

  //doanh thu theo ngày hoặc tháng; kỳ không có đơn vẫn trả về với giá trị 0 (để vẽ biểu đồ liền mạch)
  async revenue({ from, to, group_by }: RevenueQuery) {
    const unit = group_by === 'month' ? 'month' : 'day'
    const end: Date = to ?? new Date()
    const start: Date = from ?? new Date(end.getTime() - 30 * DAY_MS)
    if (start >= end) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.UNPROCESSABLE_ENTITY, message: STATS_MESSAGES.RANGE_IS_INVALID })
    }
    const maxMs = unit === 'day' ? 366 * DAY_MS : 60 * 31 * DAY_MS
    if (end.getTime() - start.getTime() > maxMs) {
      throw new ErrorWithStatus({ status: HTTP_STATUS.UNPROCESSABLE_ENTITY, message: STATS_MESSAGES.RANGE_TOO_LARGE })
    }
    const step = unit === 'month' ? Prisma.sql`interval '1 month'` : Prisma.sql`interval '1 day'`
    //created_at là timestamp không múi giờ (UTC): đổi sang giờ VN rồi mới cắt theo ngày/tháng
    const local = (column: Prisma.Sql) => Prisma.sql`(${column} AT TIME ZONE 'UTC' AT TIME ZONE ${TIME_ZONE})`
    const rows = await databaseService.$queryRaw<{ period: string; revenue: bigint; orders: number }[]>`
      WITH periods AS (
        SELECT generate_series(
          date_trunc(${unit}, ${local(Prisma.sql`${start}::timestamp`)}),
          date_trunc(${unit}, ${local(Prisma.sql`(${end}::timestamp - interval '1 millisecond')`)}),
          ${step}
        ) AS period
      ),
      sales AS (
        SELECT date_trunc(${unit}, ${local(Prisma.sql`created_at`)}) AS period,
               SUM(total_amount) AS revenue,
               COUNT(*)::int AS orders
        FROM orders
        WHERE status = 'Delivered' AND created_at >= ${start} AND created_at < ${end}
        GROUP BY 1
      )
      SELECT to_char(periods.period, ${unit === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD'}) AS period,
             COALESCE(sales.revenue, 0)::bigint AS revenue,
             COALESCE(sales.orders, 0)::int AS orders
      FROM periods LEFT JOIN sales USING (period)
      ORDER BY periods.period`
    return {
      group_by: unit,
      time_zone: TIME_ZONE,
      items: rows.map((row) => ({ period: row.period, revenue: Number(row.revenue), orders: row.orders }))
    }
  }

  //sản phẩm bán chạy (đơn Delivered). Sản phẩm đã bị xoá vẫn được tính theo tên lưu trong đơn
  async topProducts({ from, to, limit }: TopProductsQuery) {
    const take: number = limit ?? 10
    const created_at = dateRange({ from, to })
    const rows = await databaseService.$queryRaw<
      { product_id: string | null; product_name: string; quantity_sold: number; revenue: bigint }[]
    >`
      SELECT (array_agg(oi.product_id))[1] AS product_id,
             (array_agg(oi.product_name ORDER BY o.created_at DESC))[1] AS product_name,
             SUM(oi.quantity)::int AS quantity_sold,
             SUM(oi.quantity::bigint * oi.unit_price)::bigint AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status = 'Delivered'
        ${created_at?.gte ? Prisma.sql`AND o.created_at >= ${created_at.gte}` : Prisma.empty}
        ${created_at?.lt ? Prisma.sql`AND o.created_at < ${created_at.lt}` : Prisma.empty}
      GROUP BY COALESCE(oi.product_id::text, 'name:' || oi.product_name)
      ORDER BY quantity_sold DESC, revenue DESC
      LIMIT ${take}`
    return {
      items: rows.map((row) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        quantity_sold: row.quantity_sold,
        revenue: Number(row.revenue)
      }))
    }
  }

  //sản phẩm đang bán mà sắp hết hàng (stock <= threshold), ít hàng nhất lên đầu
  async lowStock({ threshold, ...query }: LowStockQuery) {
    const { page, limit, skip, take } = getPagination(query)
    const where: Prisma.ProductWhereInput = { is_active: true, stock: { lte: threshold ?? 5 } }
    const [items, total] = await Promise.all([
      databaseService.products.findMany({
        where,
        orderBy: [{ stock: 'asc' }, { id: 'asc' }],
        skip,
        take,
        select: { id: true, name: true, slug: true, stock: true, images: true }
      }),
      databaseService.products.count({ where })
    ])
    return buildPage({ items, total, page, limit })
  }
}

const statsServices = new StatsServices()
export default statsServices
