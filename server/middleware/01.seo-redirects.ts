import { getQuery, getRequestURL, sendRedirect, setResponseHeader } from 'h3'
import { isPublicSitePath, resolvePrimalCutSeoRedirect, siteCacheHeaders } from '~~/shared/site-routes'

/**
 * 公开官网 SEO 路径 301 收敛与边缘缓存洁净度中间件：
 * 1. `/en`、`/en/*`、`/zh/*`、`/zh-CN/*`、`/zh-TW/*`、尾部斜杠及公开页 `?lang=` 单跳 301 至规范路径；
 * 2. 严禁按 `Accept-Language` 对 `/` 做动态跳转；
 * 3. 匿名访问公开路径输出纯净 `Cache-Control: public`，零 `Set-Cookie`、零 `Vary: Cookie`。
 */
export default defineEventHandler((event) => {
  const { pathname } = getRequestURL(event)
  if (pathname.startsWith('/api/') || pathname.startsWith('/_nuxt/')) return

  const decision = resolvePrimalCutSeoRedirect(pathname, getQuery(event), event.method)
  if (decision) {
    return sendRedirect(event, decision.location, decision.statusCode)
  }

  const method = event.method.toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return
  if (!isPublicSitePath(pathname)) return

  const headers = siteCacheHeaders()
  for (const [key, value] of Object.entries(headers)) {
    setResponseHeader(event, key, value)
  }
})
