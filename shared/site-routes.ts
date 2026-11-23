// 素裁 PrimalCut 公开官网 8 国语言路径路由、单跳 301 归一化、边缘缓存洁净度、Hreflang 矩阵与 Schema.org 结构化数据契约。
// 纯函数无外部依赖：供服务端中间件、前端视图与裸 Node 单测直接导入。

import { normalizeLanguage, productNameFor, type Language } from './language'

export const SITE_ORIGIN = 'https://primal-cut.if9.cool'
export const IF9_ORIGIN = 'https://if9.cool'

export const SITE_LOCALES = ['en', 'ja', 'zh-CN', 'zh-TW', 'ko', 'de', 'fr', 'es'] as const
export type SiteLocale = (typeof SITE_LOCALES)[number]
export const SITE_DEFAULT_LOCALE: SiteLocale = 'en'

export const SITE_LOCALE_SEGMENTS: Readonly<Record<SiteLocale, string>> = {
  'en': '',
  'ja': 'ja',
  'zh-CN': 'zh-cn',
  'zh-TW': 'zh-tw',
  'ko': 'ko',
  'de': 'de',
  'fr': 'fr',
  'es': 'es',
}

const SEGMENT_TO_SITE_LOCALE: Readonly<Record<string, SiteLocale>> = {
  'en': 'en',
  'ja': 'ja',
  'zh': 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-hans': 'zh-CN',
  'zh-sg': 'zh-CN',
  'zh-tw': 'zh-TW',
  'zh-hk': 'zh-TW',
  'zh-mo': 'zh-TW',
  'zh-hant': 'zh-TW',
  'ko': 'ko',
  'de': 'de',
  'fr': 'fr',
  'es': 'es',
}

export const PUBLIC_BARE_PATHS = ['/', '/vs-iconutil-image2icon'] as const
export type PublicBarePath = (typeof PUBLIC_BARE_PATHS)[number]

export const WORKSPACE_ENTRY_PATH = '/app'

export function isPublicBarePath(barePath: string): barePath is PublicBarePath {
  return (PUBLIC_BARE_PATHS as readonly string[]).includes(barePath)
}

/** 校验动态路由 `[locale]` 首段：仅放行规范小写非默认公开语言前缀（7 语），其余抛 404。 */
export function parseSiteLocaleSegment(segment: unknown): SiteLocale | null {
  if (typeof segment !== 'string') return null
  const trimmed = segment.trim()
  if (!trimmed || trimmed !== trimmed.toLowerCase()) return null
  for (const locale of SITE_LOCALES) {
    if (locale === SITE_DEFAULT_LOCALE) continue
    if (SITE_LOCALE_SEGMENTS[locale] === trimmed) return locale
  }
  return null
}

export function normalizePathname(pathname: string): string {
  const raw = (pathname.split('?')[0] || '/').trim()
  if (!raw || raw === '/') return '/'
  const withLead = raw.startsWith('/') ? raw : `/${raw}`
  return withLead.length > 1 ? withLead.replace(/\/+$/, '') : '/'
}

export interface ParsedSeoPath {
  locale: SiteLocale | null
  barePath: string
  isPublicSeo: boolean
  /** 携带了 `/en`、`/zh`、`/zh-CN`、`/zh-TW`、大写或尾部斜杠等非规范前缀，需 301 归一化 */
  needsPathNormalization: boolean
}

export function parsePublicSeoPath(pathname: string): ParsedSeoPath {
  const rawWithoutQuery = (pathname.split('?')[0] || '/').trim() || '/'
  const hasTrailingSlash = rawWithoutQuery.length > 1 && rawWithoutQuery.endsWith('/')
  const clean = normalizePathname(pathname)
  if (clean === '/') {
    return { locale: SITE_DEFAULT_LOCALE, barePath: '/', isPublicSeo: true, needsPathNormalization: false }
  }
  const parts = clean.slice(1).split('/')
  const rawFirst = parts[0]!
  const lowerFirst = rawFirst.toLowerCase()
  const matched = SEGMENT_TO_SITE_LOCALE[lowerFirst]
  if (matched) {
    const rest = parts.length > 1 ? `/${parts.slice(1).join('/')}` : '/'
    if (isPublicBarePath(rest)) {
      const canonicalSeg = SITE_LOCALE_SEGMENTS[matched]
      return {
        locale: matched,
        barePath: rest,
        isPublicSeo: true,
        needsPathNormalization: rawFirst !== canonicalSeg || hasTrailingSlash,
      }
    }
  }
  if (isPublicBarePath(clean)) {
    return {
      locale: SITE_DEFAULT_LOCALE,
      barePath: clean,
      isPublicSeo: true,
      needsPathNormalization: hasTrailingSlash,
    }
  }
  return { locale: null, barePath: clean, isPublicSeo: false, needsPathNormalization: false }
}

export function siteLocalePath(barePath: string, locale: SiteLocale = SITE_DEFAULT_LOCALE): string {
  const parsed = parsePublicSeoPath(barePath)
  const targetBare = parsed.isPublicSeo ? parsed.barePath : normalizePathname(barePath)
  if (!isPublicBarePath(targetBare)) return targetBare
  const seg = SITE_LOCALE_SEGMENTS[locale]
  if (!seg) return targetBare
  return targetBare === '/' ? `/${seg}` : `/${seg}${targetBare}`
}

/** 返回全部 16 条公开规范 HTML 路径（8 语言 × 2 个公开页面），供边缘缓存与自动化测试枚举。 */
export function listAllPublicSeoPaths(): string[] {
  return PUBLIC_BARE_PATHS.flatMap((barePath) =>
    SITE_LOCALES.map((locale) => siteLocalePath(barePath, locale)),
  )
}

export const PUBLIC_SITE_PATHS: readonly string[] = listAllPublicSeoPaths()

export function isPublicSitePath(pathname: string): boolean {
  const clean = normalizePathname(pathname)
  return PUBLIC_SITE_PATHS.includes(clean)
}

function parseLangQuery(value: unknown): SiteLocale | null {
  const raw = Array.isArray(value) ? value[0] : value
  return normalizeLanguage(raw)
}

/**
 * 统一计算服务端单跳 301 永久重定向目标：
 * 1. 公开 SEO 页携带 `/en`、`/en/*`、`/zh/*`、`/zh-CN/*`、`/zh-TW/*`、大小写前缀、尾部斜杠或 `?lang=` 查询参数时，单跳 301 收敛至规范路径；
 * 2. 严禁按 `Accept-Language` 对 `/` 做动态跳转；
 * 3. 非公开 SEO 页（`/app`、`/api/*`、`/_nuxt/*`）保持原样不拦截。
 */
export function resolvePrimalCutSeoRedirect(
  pathname: string,
  query: Record<string, unknown> = {},
  method = 'GET',
): { location: string; statusCode: 301 } | null {
  const upper = method.toUpperCase()
  if (upper !== 'GET' && upper !== 'HEAD') return null
  const rawWithoutQuery = (pathname.split('?')[0] || '/').trim() || '/'
  if (rawWithoutQuery.startsWith('/api/') || rawWithoutQuery.startsWith('/_nuxt/')) return null

  const parsed = parsePublicSeoPath(rawWithoutQuery)
  if (!parsed.isPublicSeo) return null

  const hasLangParam = Object.prototype.hasOwnProperty.call(query, 'lang')
  const queryLocale = parseLangQuery(query.lang)

  if (!parsed.needsPathNormalization && !hasLangParam) return null

  const targetLocale = queryLocale ?? parsed.locale ?? SITE_DEFAULT_LOCALE
  const destPath = siteLocalePath(parsed.barePath, targetLocale)

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (key === 'lang' || value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') params.append(key, item)
      }
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  return {
    location: qs ? `${destPath}?${qs}` : destPath,
    statusCode: 301,
  }
}

/** 匿名无 Cookie 访问公开路径零 Vary: Cookie、零 Set-Cookie，仅下发纯净公共缓存头。 */
export function siteCacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
  }
}

export interface AlternateLink {
  hreflang: string
  href: string
}

export function buildPrimalCutAlternates(
  barePath: PublicBarePath,
  currentLocale: SiteLocale,
  origin = SITE_ORIGIN,
): { canonical: string; alternates: AlternateLink[] } {
  const clean = origin.replace(/\/+$/, '')
  const canonical = `${clean}${siteLocalePath(barePath, currentLocale)}`
  const alternates: AlternateLink[] = SITE_LOCALES.map((locale) => ({
    hreflang: locale,
    href: `${clean}${siteLocalePath(barePath, locale)}`,
  }))
  alternates.push({
    hreflang: 'x-default',
    href: `${clean}${siteLocalePath(barePath, SITE_DEFAULT_LOCALE)}`,
  })
  return { canonical, alternates }
}

/** 构造指向主站 `if9.cool` 同语种规范路径的纯净链接（避免 `?lang=` 301 跳转）。 */
export function if9HubHref(locale: SiteLocale, barePath = '/'): string {
  const clean = barePath.startsWith('/') ? barePath : `/${barePath}`
  const seg = SITE_LOCALE_SEGMENTS[locale]
  if (!seg) return `${IF9_ORIGIN}${clean}`
  return clean === '/' ? `${IF9_ORIGIN}/${seg}` : `${IF9_ORIGIN}/${seg}${clean}`
}

export interface BuildPrimalCutJsonLdOptions {
  origin?: string
  locale?: SiteLocale
  barePath?: PublicBarePath
  title?: string
  description?: string
  faqItems?: ReadonlyArray<{ q: string; a: string }>
  breadcrumbName?: string
}

const DEFAULT_LD_DESCRIPTIONS: Readonly<Record<Language, string>> = {
  'en': 'Free client-side PNG to macOS .icns and multi-size PNG icon generator. Applies Apple 22.37% rounded corners, 120px safe padding, and bicubic resampling locally in your browser with zero uploads.',
  'ja': 'ブラウザ上で完結する無料の PNG → macOS .icns・複数サイズ PNG アイコン生成ツール。22.37% の角丸、120px 安全余白、バイキュービック補間をローカル処理し、画像をサーバーへ送信しません。',
  'zh-CN': '纯浏览器本地运行的 PNG 转 macOS .icns 与多尺寸 PNG 图标生成工具，自动应用 22.37% macOS 圆角、120px 安全边距与双三次插值，图像零上传。',
  'zh-TW': '純瀏覽器本機運行的 PNG 轉 macOS .icns 與多尺寸 PNG 圖示生成工具，自動套用 22.37% macOS 圓角、120px 安全邊距與雙三次插值，圖片零上傳。',
  'ko': '브라우저에서 로컬로 실행되는 무료 PNG → macOS .icns 및 다중 크기 PNG 아이콘 생성기. 22.37% 둥근 모서리, 120px 안전 여백, 바이큐빅 리샘플링을 업로드 없이 처리합니다.',
  'de': 'Kostenloser clientseitiger Konverter von PNG zu macOS-.icns und mehrskaligen PNG-Sets. Wendet 22,37 % macOS-Rundung, 120-px-Schutzabstand und bikubische Skalierung lokal ohne Upload an.',
  'fr': 'Générateur gratuit côté client de PNG vers .icns macOS et jeux d’icônes PNG multi-tailles. Applique localement l’arrondi macOS de 22,37 %, la marge de sécurité de 120 px et le rééchantillonnage bicubique sans envoi serveur.',
  'es': 'Conversor gratuito en el navegador de PNG a .icns de macOS y paquetes PNG multiresolución. Aplica esquinas redondeadas al 22,37 %, margen seguro de 120 px y reescalado bicúbico en local sin subir archivos.',
}

export function buildPrimalCutJsonLd(input: string | BuildPrimalCutJsonLdOptions = SITE_ORIGIN) {
  const opts: BuildPrimalCutJsonLdOptions = typeof input === 'string' ? { origin: input } : input
  const cleanOrigin = (opts.origin || SITE_ORIGIN).replace(/\/+$/, '')
  const locale = opts.locale ?? SITE_DEFAULT_LOCALE
  const barePath = opts.barePath ?? '/'
  const localProductName = productNameFor(locale)
  const appName = locale === 'zh-CN' || locale === 'zh-TW' ? `${localProductName} PrimalCut` : 'PrimalCut'
  const homeUrl = `${cleanOrigin}${siteLocalePath('/', locale)}`
  const pageUrl = `${cleanOrigin}${siteLocalePath(barePath, locale)}`
  const description = opts.description || DEFAULT_LD_DESCRIPTIONS[locale]

  const publisher = {
    '@type': 'Organization',
    '@id': `${IF9_ORIGIN}/#organization`,
    'name': 'if9 Studio',
    'legalName': 'IF9 Studio LLC',
    'url': `${IF9_ORIGIN}/`,
  }

  const softwareApp: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': appName,
    'alternateName': 'PrimalCut',
    ...(opts.title ? { headline: opts.title } : {}),
    'description': description,
    'url': homeUrl,
    'inLanguage': locale,
    'applicationCategory': 'DesignApplication',
    'operatingSystem': 'Web, macOS, Windows, Linux',
    'offers': [
      {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD',
      },
    ],
    'author': {
      '@id': `${IF9_ORIGIN}/#organization`,
    },
    'publisher': publisher,
  }

  if (!opts.faqItems?.length && !(barePath !== '/' && opts.breadcrumbName)) {
    return softwareApp
  }

  const graph: Array<Record<string, unknown>> = [softwareApp]

  if (opts.faqItems && opts.faqItems.length > 0) {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'inLanguage': locale,
      'mainEntity': opts.faqItems.map((item) => ({
        '@type': 'Question',
        'name': item.q,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': item.a,
        },
      })),
    })
  }

  if (barePath !== '/' && opts.breadcrumbName) {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': localProductName, 'item': homeUrl },
        { '@type': 'ListItem', 'position': 2, 'name': opts.breadcrumbName, 'item': pageUrl },
      ],
    })
  }

  return graph
}

export function buildRobotsTxt(origin = SITE_ORIGIN): string {
  const cleanOrigin = origin.replace(/\/+$/, '')
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /app',
    'Disallow: /api/',
    '',
    `Sitemap: ${cleanOrigin}/sitemap.xml`,
    '',
  ].join('\n')
}

export function buildSitemapXml(origin = SITE_ORIGIN): string {
  const cleanOrigin = origin.replace(/\/+$/, '')
  const entries = PUBLIC_BARE_PATHS.flatMap((barePath) =>
    SITE_LOCALES.map((locale) => {
      const { canonical, alternates } = buildPrimalCutAlternates(barePath, locale, cleanOrigin)
      const altTags = alternates
        .map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" />`)
        .join('\n')
      return `  <url>\n    <loc>${canonical}</loc>\n${altTags}\n  </url>`
    }),
  ).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    entries,
    '</urlset>',
    '',
  ].join('\n')
}

export function buildLlmsTxt(origin = SITE_ORIGIN): string {
  const cleanOrigin = origin.replace(/\/+$/, '')
  return [
    '# PrimalCut',
    '',
    '> Client-side PNG to macOS .icns and multi-size PNG icon generator. Applies Apple 22.37% rounded corners, 120px safe padding on a 1264x1264 canvas, and bicubic resampling directly in the browser without uploading files. Built by if9 (IF9 Studio LLC).',
    '',
    '## Key Pages (8 Languages)',
    `- [Overview — English](${cleanOrigin}/): Local PNG to macOS .icns converter and multi-size PNG ZIP exporter.`,
    `- [Comparison: PrimalCut vs iconutil CLI & Image2icon](${cleanOrigin}/vs-iconutil-image2icon): Side-by-side comparison of browser-based zero-install ICNS generation, Apple iconutil scripts, and native macOS desktop utilities.`,
    `- [日本語](${cleanOrigin}/ja): ブラウザ完結型の PNG → macOS .icns・複数サイズ PNG アイコン生成ツール。`,
    `- [简体中文（素裁）](${cleanOrigin}/zh-cn): 纯浏览器本地运行的 PNG 转 macOS .icns 与多尺寸 PNG 图标工具。`,
    `- [繁體中文（素裁）](${cleanOrigin}/zh-tw): 純瀏覽器本機運行的 PNG 轉 macOS .icns 與多尺寸 PNG 圖示工具。`,
    `- [한국어](${cleanOrigin}/ko): 업로드 없이 브라우저에서 바로 처리하는 PNG → macOS .icns 및 다중 크기 PNG 아이콘 생성기.`,
    `- [Deutsch](${cleanOrigin}/de): Clientseitiger PNG-zu-macOS-.icns- und Multi-Size-PNG-Konverter ohne Datei-Upload.`,
    `- [Français](${cleanOrigin}/fr): Générateur local de PNG vers .icns macOS et jeux d’icônes PNG multi-tailles sans téléversement.`,
    `- [Español](${cleanOrigin}/es): Conversor local en navegador de PNG a .icns de macOS y paquetes PNG multiresolución sin subir archivos.`,
    '- [if9 Studio](https://if9.cool/): Independent software studio behind PrimalCut, MasCopy, MOA, Firn, and Mioo.',
    '',
  ].join('\n')
}
