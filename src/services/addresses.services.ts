import databaseService from './database.services'
import HTTP_STATUS from '~/constants/httpStatus'
import { ADDRESS_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { AddressReqBody, UpdateAddressReqBody } from '~/models/requests/Shop.requests'
import { lockUserRow } from '~/utils/locks'

const MAX_ADDRESSES = 10
const addressNotFound = () =>
  new ErrorWithStatus({ status: HTTP_STATUS.NOT_FOUND, message: ADDRESS_MESSAGES.NOT_FOUND })

class AddressesServices {
  //địa chỉ mặc định lên đầu, sau đó mới nhất trước
  getList(user_id: string) {
    return databaseService.addresses.findMany({
      where: { user_id },
      orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }, { id: 'asc' }]
    })
  }

  async create(user_id: string, body: AddressReqBody) {
    return databaseService.$transaction(async (tx) => {
      await lockUserRow(tx, user_id) //2 request thêm cùng lúc không vượt giới hạn / không có 2 địa chỉ mặc định
      const count = await tx.address.count({ where: { user_id } })
      if (count >= MAX_ADDRESSES) {
        throw new ErrorWithStatus({ status: HTTP_STATUS.CONFLICT, message: ADDRESS_MESSAGES.LIMIT_REACHED })
      }
      //địa chỉ đầu tiên luôn là mặc định
      const is_default = count === 0 || body.is_default === true
      if (is_default) await tx.address.updateMany({ where: { user_id, is_default: true }, data: { is_default: false } })
      return tx.address.create({
        data: { user_id, name: body.name, phone: body.phone, address: body.address, is_default }
      })
    })
  }

  //địa chỉ của người khác trả 404
  async update(id: string, user_id: string, body: UpdateAddressReqBody) {
    return databaseService.$transaction(async (tx) => {
      await lockUserRow(tx, user_id)
      const current = await tx.address.findFirst({ where: { id, user_id } })
      if (!current) throw addressNotFound()
      //muốn bỏ mặc định thì phải chọn địa chỉ khác làm mặc định (luôn có đúng 1 địa chỉ mặc định)
      const { is_default, ...fields } = body
      if (is_default === true && !current.is_default) {
        await tx.address.updateMany({ where: { user_id, is_default: true }, data: { is_default: false } })
      }
      return tx.address.update({
        where: { id },
        data: { ...fields, ...(is_default === true && { is_default: true }) }
      })
    })
  }

  async delete(id: string, user_id: string) {
    await databaseService.$transaction(async (tx) => {
      await lockUserRow(tx, user_id)
      const current = await tx.address.findFirst({ where: { id, user_id } })
      if (!current) throw addressNotFound()
      await tx.address.delete({ where: { id } })
      //xoá địa chỉ mặc định thì chuyển mặc định sang địa chỉ mới nhất còn lại
      if (current.is_default) {
        const next = await tx.address.findFirst({ where: { user_id }, orderBy: { created_at: 'desc' } })
        if (next) await tx.address.update({ where: { id: next.id }, data: { is_default: true } })
      }
    })
  }
}

const addressesServices = new AddressesServices()
export default addressesServices
