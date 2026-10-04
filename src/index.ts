//dựng sever với express
import express from 'express'
import dotenv from 'dotenv'
import userRouter from './routes/users.routers'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middleware'
import mediaRouter from './routes/medias.routers'
import { initFolder } from './utils/file'
import staticRouter from './routes/static.routers'
import categoryRouter from './routes/categories.routers'
import productRouter from './routes/products.routers'
import cartRouter from './routes/carts.routers'
import orderRouter from './routes/orders.routers'
import adminRouter from './routes/admin.routers'

dotenv.config()
const app = express()
const PORT = Number(process.env.PORT) || 3000

//kết nối PostgreSQL (qua Prisma)
databaseService.connect()
initFolder() // mỗi lần sever chạy thì nó sẽ tạo luôn thư mục upload cho mình luôn
app.use(express.json()) // cho sever xài 1 middleware biến đổi json -> ko có cái này sẽ bị biến thành undefined
//server dùng cái route đã tạo
app.use('/users', userRouter)
app.use('/medias', mediaRouter)
app.use('/static', staticRouter)
app.use('/categories', categoryRouter)
app.use('/products', productRouter)
app.use('/cart', cartRouter)
app.use('/orders', orderRouter)
app.use('/admin', adminRouter)
//http://localhost:3000/users/login body{email, password}

app.use(defaultErrorHandler)
//-> điểm tập kết lỗi của hệ thốnng -> điểm tập kết lỗi

app.listen(PORT, () => {
  console.log('SERVER BE đang chạy trên port : ' + PORT)
})
