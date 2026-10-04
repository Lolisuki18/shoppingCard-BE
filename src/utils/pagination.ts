//page bắt đầu từ 1; chuyển thành skip/take cho Prisma
export const getPagination = ({ page, limit }: { page?: number; limit?: number }) => {
  const _page = page && page > 0 ? page : 1
  const _limit = limit && limit > 0 ? Math.min(limit, 100) : 20
  return { page: _page, limit: _limit, skip: (_page - 1) * _limit, take: _limit }
}

//định dạng chung cho mọi API trả về danh sách
export const buildPage = <T>({
  items,
  total,
  page,
  limit
}: {
  items: T[]
  total: number
  page: number
  limit: number
}) => ({
  items,
  page,
  limit,
  total,
  total_pages: Math.ceil(total / limit)
})
