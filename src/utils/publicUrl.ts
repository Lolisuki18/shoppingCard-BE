//địa chỉ công khai của BE (không có dấu / ở cuối). Dùng để dựng URL ảnh/video upload và link trong email
export const apiUrl = () => (process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '')
