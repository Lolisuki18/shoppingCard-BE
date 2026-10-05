import nodemailer, { Transporter } from 'nodemailer'
import { OrderStatus } from '@prisma/client'
import dotenv from 'dotenv'
import databaseService from './database.services'
import { logger } from '~/utils/logger'
dotenv.config()

//địa chỉ BE (link xác thực email trỏ về BE) và FE (link đặt lại mật khẩu trỏ về FE)
const apiUrl = () => (process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '')
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:8000').replace(/\/$/, '')
const shopName = () => process.env.SHOP_NAME || 'Shopping Card'

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  )
const vnd = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + ' ₫'

const STATUS_TEXT: Record<OrderStatus, string> = {
  Pending: 'đang chờ xác nhận',
  Confirmed: 'đã được xác nhận',
  Shipping: 'đang được giao',
  Delivered: 'đã giao thành công',
  Cancelled: 'đã bị huỷ'
}

interface MailInput {
  to: string
  subject: string
  html: string
  text: string
}

class MailServices {
  private transporter: Transporter | null | undefined

  //chưa cấu hình SMTP_HOST thì chạy chế độ dev: in nội dung mail ra log thay vì gửi
  private getTransporter() {
    if (this.transporter === undefined) {
      const host = process.env.SMTP_HOST
      this.transporter = host
        ? nodemailer.createTransport({
            host,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
          })
        : null
    }
    return this.transporter
  }

  //không bao giờ throw: gửi mail lỗi không được làm hỏng request (đặt hàng, đăng ký...) đã thành công
  async send({ to, subject, html, text }: MailInput) {
    try {
      const transporter = this.getTransporter()
      if (!transporter) {
        logger.info('mail (dev, chưa cấu hình SMTP_HOST)', { to, subject, text })
        return
      }
      await transporter.sendMail({
        from: process.env.MAIL_FROM || `"${shopName()}" <no-reply@localhost>`,
        to,
        subject,
        html,
        text
      })
    } catch (error) {
      logger.error('gửi mail thất bại', { to, subject, error })
    }
  }

  private layout(title: string, body: string) {
    return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222">
  <h2 style="color:#111">${escapeHtml(shopName())}</h2><h3>${title}</h3>${body}
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0"><p style="color:#888;font-size:12px">Email tự động, vui lòng không trả lời.</p></div>`
  }

  private button(url: string, label: string) {
    return `<p><a href="${url}" style="background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">${label}</a></p>
<p style="font-size:12px;color:#666">Nếu nút không bấm được, mở link: ${url}</p>`
  }

  //---------------- tài khoản ----------------
  sendVerifyEmail(to: string, name: string, token: string) {
    const url = `${apiUrl()}/users/verify-email?email_verify_token=${encodeURIComponent(token)}`
    return this.send({
      to,
      subject: `[${shopName()}] Xác thực email của bạn`,
      html: this.layout(
        'Xác thực email',
        `<p>Xin chào ${escapeHtml(name || 'bạn')}, bấm nút bên dưới để xác thực email và bắt đầu mua sắm.</p>${this.button(url, 'Xác thực email')}`
      ),
      text: `Xin chào ${name || 'bạn'}, mở link để xác thực email: ${url}`
    })
  }

  sendForgotPassword(to: string, name: string, token: string) {
    const url = `${clientUrl()}/reset-password?forgot_password_token=${encodeURIComponent(token)}`
    return this.send({
      to,
      subject: `[${shopName()}] Đặt lại mật khẩu`,
      html: this.layout(
        'Đặt lại mật khẩu',
        `<p>Xin chào ${escapeHtml(name || 'bạn')}, chúng tôi nhận được yêu cầu đặt lại mật khẩu. Nếu không phải bạn, hãy bỏ qua email này.</p>${this.button(url, 'Đặt lại mật khẩu')}`
      ),
      text: `Mở link để đặt lại mật khẩu: ${url}`
    })
  }

  //---------------- đơn hàng ----------------
  //đọc lại đơn từ DB (đã commit) rồi gửi mail; kind 'created' = xác nhận đặt hàng, 'status' = đổi trạng thái
  async sendOrderMail(order_id: string, kind: 'created' | 'status') {
    try {
      const order = await databaseService.orders.findUnique({
        where: { id: order_id },
        include: { items: { orderBy: { product_name: 'asc' } }, user: { select: { email: true, name: true } } }
      })
      if (!order) return
      const rows = order.items
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.product_name)} × ${item.quantity}</td><td style="text-align:right">${vnd(item.unit_price * item.quantity)}</td></tr>`
        )
        .join('')
      const discount = order.discount_amount
        ? `<tr><td>Giảm giá (${escapeHtml(order.coupon_code)})</td><td style="text-align:right">-${vnd(order.discount_amount)}</td></tr>`
        : ''
      const table = `<table style="width:100%;border-collapse:collapse">${rows}${discount}<tr><td><b>Tổng thanh toán</b></td><td style="text-align:right"><b>${vnd(order.total_amount)}</b></td></tr></table>
<p>Giao đến: ${escapeHtml(order.shipping_name)} - ${escapeHtml(order.shipping_phone)}<br>${escapeHtml(order.shipping_address)}</p>`
      const ref = order.id.slice(0, 8).toUpperCase()
      const created = kind === 'created'
      return this.send({
        to: order.user.email,
        subject: created
          ? `[${shopName()}] Đã nhận đơn hàng #${ref}`
          : `[${shopName()}] Đơn hàng #${ref} ${STATUS_TEXT[order.status]}`,
        html: this.layout(
          created ? 'Cảm ơn bạn đã đặt hàng' : `Đơn hàng #${ref} ${STATUS_TEXT[order.status]}`,
          `<p>Xin chào ${escapeHtml(order.user.name || 'bạn')},</p>${table}`
        ),
        text: created
          ? `Đã nhận đơn #${ref}, tổng ${vnd(order.total_amount)}.`
          : `Đơn #${ref} ${STATUS_TEXT[order.status]}.`
      })
    } catch (error) {
      logger.error('không gửi được mail đơn hàng', { order_id, error })
    }
  }
}

const mailServices = new MailServices()
export default mailServices
