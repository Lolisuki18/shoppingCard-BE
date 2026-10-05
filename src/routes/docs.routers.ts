import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import YAML from 'yaml'

//tài liệu API tương tác (Swagger UI) tại /docs, file đặc tả gốc tại /docs/openapi.json
//mặc định bật khi không phải production; production đặt ENABLE_DOCS=true nếu muốn mở
export const OPENAPI_PATH = path.resolve('docs/openapi.yaml')
export const loadOpenApi = () => YAML.parse(fs.readFileSync(OPENAPI_PATH, 'utf8'))

export const docsEnabled = () =>
  process.env.ENABLE_DOCS ? process.env.ENABLE_DOCS === 'true' : process.env.NODE_ENV !== 'production'

const docsRouter = Router()
//Swagger UI cần chạy script inline nên trang docs dùng helmet với CSP tắt (phần còn lại của API vẫn có CSP đầy đủ)
docsRouter.use(helmet({ contentSecurityPolicy: false }))
docsRouter.get('/openapi.json', (req, res) => {
  res.json(loadOpenApi())
})
docsRouter.use('/', swaggerUi.serve, swaggerUi.setup(undefined, { swaggerOptions: { url: 'docs/openapi.json' } }))

export default docsRouter
