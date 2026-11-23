import { getHeader, getRequestURL } from 'h3'
import type { H3Event } from 'h3'
import { SITE_ORIGIN } from '~~/shared/site-routes'

export function getPublicOrigin(event: H3Event): string {
  const reqUrl = getRequestURL(event)
  const forwardedHost = getHeader(event, 'x-forwarded-host')?.split(',')[0]?.trim()
  const forwardedProto = getHeader(event, 'x-forwarded-proto')?.split(',')[0]?.trim()
  const host = forwardedHost || reqUrl.host
  if (!host || host === 'localhost' || host.startsWith('127.0.0.1')) {
    return SITE_ORIGIN
  }
  const proto = forwardedProto === 'http' || forwardedProto === 'https' ? forwardedProto : 'https'
  return `${proto}://${host}`
}
