import { describe, expect, it } from 'vitest'
import app from '~/app'
import { loadOpenApi } from '~/routes/docs.routers'
import { api } from './helpers'

//liệt kê mọi route Express (METHOD /path/{param}) bằng cách đi qua router stack
const mountPath = (layer: any): string => {
  if (layer.regexp.fast_slash) return ''
  return layer.regexp.source.replace('^\\/', '/').replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/')
}
const collect = (stack: any[], prefix: string, out: string[]) => {
  for (const layer of stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) {
        const route = (prefix + layer.route.path).replace(/:([A-Za-z_]+)/g, '{$1}').replace(/\/$/, '') || '/'
        out.push(`${method.toUpperCase()} ${route}`)
      }
    } else if (layer.name === 'router' && layer.handle.stack) {
      collect(layer.handle.stack, prefix + mountPath(layer), out)
    }
  }
}

describe('tài liệu OpenAPI', () => {
  const spec = loadOpenApi()
  const routes: string[] = []
  collect((app as any)._router.stack, '', routes)
  const documented = new Set<string>()
  for (const [route, item] of Object.entries<any>(spec.paths)) {
    for (const method of Object.keys(item)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) documented.add(`${method.toUpperCase()} ${route}`)
    }
  }

  it('mọi route của API đều có trong docs/openapi.yaml', () => {
    const missing = routes.filter((r) => !r.startsWith('GET /docs') && !documented.has(r))
    expect(missing).toEqual([])
  })

  it('docs không mô tả route không còn tồn tại', () => {
    expect([...documented].filter((d) => !routes.includes(d))).toEqual([])
  })

  it('mọi $ref trỏ tới phần tử có thật', () => {
    const refs = [...JSON.stringify(spec).matchAll(/"\$ref":"#\/([^"]+)"/g)].map((m) => m[1])
    for (const ref of new Set(refs)) {
      const target = ref.split('/').reduce((node: any, key) => node?.[key], spec)
      expect(target, `thiếu ${ref}`).toBeTruthy()
    }
  })

  it('Swagger UI và /docs/openapi.json hoạt động', async () => {
    expect((await api.get('/docs/')).status).toBe(200)
    const json = await api.get('/docs/openapi.json')
    expect(Object.keys(json.body.paths).length).toBe(Object.keys(spec.paths).length)
  })
})
