import { getQuery, setResponseHeader } from 'h3'
import { normalizeLanguage } from '~~/shared/language'
import { IF9_ORIGIN } from '~~/shared/site-routes'

export interface SeoNetworkProduct {
  slug?: string
  title: string
  anchor_label: string
  href: string
}

/**
 * 为公开官网提供来自 if9.cool 的同门产品纯净静态互链列表（边缘缓存 60s，超时或离线自动安全降级为空数组）。
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300')
  const query = getQuery(event)
  const lang = normalizeLanguage(query.lang) ?? 'en'

  try {
    const res = await fetch(
      `${IF9_ORIGIN}/api/seo-network?lang=${encodeURIComponent(lang)}&exclude=primal-cut`,
      { signal: AbortSignal.timeout(2500) },
    )
    if (!res.ok) return { networkProducts: [] as SeoNetworkProduct[] }
    const data = (await res.json()) as { products?: unknown }
    if (!Array.isArray(data.products)) return { networkProducts: [] as SeoNetworkProduct[] }
    const networkProducts = data.products
      .filter(
        (p): p is SeoNetworkProduct =>
          Boolean(
            p
            && typeof p === 'object'
            && typeof (p as SeoNetworkProduct).href === 'string'
            && (typeof (p as SeoNetworkProduct).anchor_label === 'string'
              || typeof (p as SeoNetworkProduct).title === 'string'),
          ),
      )
      .slice(0, 10)
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        anchor_label: p.anchor_label || p.title,
        href: p.href,
      }))
    return { networkProducts }
  } catch {
    return { networkProducts: [] as SeoNetworkProduct[] }
  }
})
