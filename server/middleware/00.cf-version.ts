// 每个经过 Worker 的响应都带上实际运行的 Cloudflare 版本 ID：if9-edge 同域预览据此核对
// 「期望预览的候选版本」与「实际命中的版本」（见 if9-cool docs/release）。
export default defineEventHandler((event) => {
  const env = event.context.cloudflare?.env as { CF_VERSION_METADATA?: { id?: string } } | undefined
  const id = env?.CF_VERSION_METADATA?.id
  if (id) setResponseHeader(event, 'x-cf-version', id)
})
