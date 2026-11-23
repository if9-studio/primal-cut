import { setResponseHeader } from 'h3'
import { getPublicOrigin } from '~~/server/lib/public-host'
import { buildLlmsTxt } from '~~/shared/site-routes'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=86400')
  return buildLlmsTxt(getPublicOrigin(event))
})
