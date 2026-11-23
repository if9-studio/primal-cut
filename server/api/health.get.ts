// 部署流程与 if9-edge 同域预览的线上核对点：返回当前运行的 Cloudflare 版本。不读数据库、不带登录态，永不缓存。
export default defineEventHandler((event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const cfVersion = (event.context.cloudflare?.env as { CF_VERSION_METADATA?: { id?: string } } | undefined)?.CF_VERSION_METADATA?.id ?? null
  return { ok: true, service: 'primal-cut', cf_version: cfVersion }
})
