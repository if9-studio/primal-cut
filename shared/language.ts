// 素裁 PrimalCut 全端（公开官网、对比页、/app 工具工作台、错误页）共享的 8 语言标识符、归一化、回退链与单遍模板引擎。
// 纯函数、零外部依赖：供服务端、客户端组件与裸 Node 单测直接导入。

export const LANGUAGES = ['en', 'ja', 'zh-CN', 'zh-TW', 'ko', 'de', 'fr', 'es'] as const
export type Language = (typeof LANGUAGES)[number]
export type LanguagePreference = 'auto' | Language

export const DEFAULT_FALLBACK_LANGUAGE: Language = 'en'

export const LANGUAGE_LABELS: Readonly<Record<Language, string>> = {
  'en': 'English',
  'ja': '日本語',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'ko': '한국어',
  'de': 'Deutsch',
  'fr': 'Français',
  'es': 'Español',
}

export const LANGUAGE_SHORT_BADGES: Readonly<Record<Language, string>> = {
  'en': 'EN',
  'ja': 'JA',
  'zh-CN': '简',
  'zh-TW': '繁',
  'ko': 'KO',
  'de': 'DE',
  'fr': 'FR',
  'es': 'ES',
}

/** 仅区分单复数的语言启用 `*One` 兄弟键；`zh-CN`、`zh-TW`、`ja`、`ko` 不写 `*One` 键。 */
export const PLURAL_ONE_LANGUAGES: ReadonlySet<Language> = new Set<Language>(['en', 'de', 'fr', 'es'])

/**
 * 品牌产品名铁律：中文名「素裁」仅在 `zh-CN` 与 `zh-TW` 中使用，
 * 其余 6 门外语（含 `ja`、`ko`）一律使用拉丁原名 `PrimalCut`，零音译。
 */
export function productNameFor(language: Language): string {
  if (language === 'zh-CN' || language === 'zh-TW') return '素裁'
  return 'PrimalCut'
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

/**
 * 变体归一化规则（对齐 LOCALIZATION_SPEC.md §三.1）：
 * 1. `zh-TW`、`zh-HK`、`zh-MO` 及所有 `zh-Hant*` -> `zh-TW`
 * 2. `zh`、`zh-CN`、`zh-SG` 及其他 `zh-*` -> `zh-CN`
 * 3. 其余带地区后缀的代码按主语言前缀匹配已支持列表（`en`、`ja`、`ko`、`de`、`fr`、`es`）
 */
export function normalizeLanguage(value: unknown): Language | null {
  if (typeof value !== 'string') return null
  const clean = value.trim().replace(/_/g, '-').toLowerCase()
  if (!clean) return null
  if (/^zh-(tw|hk|mo|hant)(?:-|$)/.test(clean)) return 'zh-TW'
  if (clean === 'zh' || clean.startsWith('zh-')) return 'zh-CN'
  for (const locale of LANGUAGES) {
    if (locale === 'zh-CN' || locale === 'zh-TW') continue
    const lower = locale.toLowerCase()
    if (clean === lower || clean.startsWith(`${lower}-`)) return locale
  }
  return null
}

export function normalizeLanguagePreference(value: unknown): LanguagePreference | null {
  if (typeof value !== 'string') return null
  const clean = value.trim().toLowerCase()
  if (clean === 'auto' || clean === 'system') return 'auto'
  return normalizeLanguage(value)
}

/**
 * 解析系统/浏览器语言候选列表；若用户系统语言不在支持列表中（如阿拉伯语、泰语、俄语），
 * 统一回退到 `en`（English），绝不给未知语种用户回退中文。
 */
export function resolveSystemLanguage(
  accepted: string | ReadonlyArray<string | null | undefined> | null | undefined,
): Language {
  if (!accepted) return DEFAULT_FALLBACK_LANGUAGE
  if (Array.isArray(accepted)) {
    for (const item of accepted) {
      const matched = normalizeLanguage(item)
      if (matched) return matched
    }
    return DEFAULT_FALLBACK_LANGUAGE
  }
  if (typeof accepted !== 'string') return DEFAULT_FALLBACK_LANGUAGE
  const tags = accepted
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const qParam = params.map((p) => p.trim()).find((p) => p.startsWith('q='))
      const q = qParam ? Number(qParam.slice(2)) : 1
      return { tag: (tag || '').trim(), q: Number.isFinite(q) ? q : 0 }
    })
    .filter((item) => item.tag && item.tag !== '*' && item.q > 0)
    .sort((a, b) => b.q - a.q)

  for (const item of tags) {
    const matched = normalizeLanguage(item.tag)
    if (matched) return matched
  }
  return DEFAULT_FALLBACK_LANGUAGE
}

function readRawCookie(cookie: string, name: string): string | null {
  if (typeof cookie !== 'string' || !cookie) return null
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const raw = cookie.match(new RegExp(`(?:^|;)\\s*${escaped}=([^;]*)`))?.[1]
  if (!raw) return null
  try {
    return decodeURIComponent(raw.trim())
  } catch {
    return null
  }
}

export function readLanguagePreferenceCookie(cookie: string): LanguagePreference | null {
  const decoded = readRawCookie(cookie, 'primalcut_lang')
  return decoded ? normalizeLanguagePreference(decoded) : null
}

export function readLanguageCookie(cookie: string): Language | null {
  const pref = readLanguagePreferenceCookie(cookie)
  return pref && pref !== 'auto' ? pref : null
}

export function readEnvLanguageCookie(cookie: string): Language | null {
  const decoded = readRawCookie(cookie, 'primalcut_env_lang')
  return decoded ? normalizeLanguage(decoded) : null
}

export function resolveLanguage(
  cookie: string,
  accepted: string | ReadonlyArray<string | null | undefined>,
  envOverride?: string | null,
): Language {
  const forced = normalizeLanguage(envOverride) ?? readEnvLanguageCookie(cookie)
  if (forced) return forced
  return readLanguageCookie(cookie) ?? resolveSystemLanguage(accepted)
}

const TIME_ZONES: ReadonlyArray<[Language, RegExp]> = [
  ['ja', /^Asia\/Tokyo$/],
  ['ko', /^Asia\/Seoul$/],
  ['zh-TW', /^Asia\/(Taipei|Hong_Kong|Macau)$/],
  ['zh-CN', /^Asia\/(Shanghai|Chongqing|Harbin|Urumqi)$/],
  ['de', /^Europe\/(Berlin|Busingen|Vienna|Zurich|Vaduz)$/],
  ['fr', /^Europe\/(Paris|Monaco)$/],
  ['es', /^(Europe\/Madrid|Atlantic\/Canary|America\/(Mexico_City|Monterrey|Cancun|Merida|Tijuana|Bogota|Lima|Santiago|Caracas|La_Paz|Montevideo|Asuncion|Guayaquil|Havana|Panama|Guatemala|Costa_Rica|El_Salvador|Tegucigalpa|Managua|Santo_Domingo|Argentina\/.+))$/],
]

export function timeZoneLocale(zone: string | null | undefined): Language | null {
  return TIME_ZONES.find(([, pattern]) => pattern.test(zone ?? ''))?.[0] ?? null
}

/**
 * 官网语言下拉框智能置顶（`orderLocales`）：
 * 将 `navigator.languages` 与时区推断语言排到列表最前面，其余保持标准 8 语顺序；
 * 禁止按当前选中语言动态重排，保证点击切换时选项不跳动。
 */
export function orderLocales(tags: ReadonlyArray<string | null | undefined>): Language[] {
  const wanted = tags.map(normalizeLanguage).filter((loc): loc is Language => loc !== null)
  return [...new Set([...wanted, ...LANGUAGES])]
}

/** 单遍替换 `{name}` 具名占位符，避免动态值中自带 `{...}` 被二次误解析。 */
export function formatMessage(
  template: string,
  params?: Readonly<Record<string, string | number | null | undefined>>,
): string {
  if (!params) return template
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (full, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(params, key)) return full
    const val = params[key]
    return val === undefined || val === null ? '' : String(val)
  })
}

export function lookupNestedValue(root: unknown, dottedPath: string): unknown {
  let cursor: unknown = root
  for (const segment of dottedPath.split('.')) {
    if (!cursor || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, segment)) {
      return undefined
    }
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return cursor
}

export function lookupNestedString(root: unknown, dottedPath: string): string | undefined {
  const val = lookupNestedValue(root, dottedPath)
  return typeof val === 'string' ? val : undefined
}

export function resolveCatalogMessage(
  catalogs: Readonly<Record<Language, unknown>>,
  language: Language,
  path: string,
  params?: Readonly<Record<string, string | number | null | undefined>>,
): string {
  const trySingular = Boolean(params && Number(params.count) === 1 && PLURAL_ONE_LANGUAGES.has(language))
  const singularPath = `${path}One`

  let raw: string | undefined
  if (trySingular) {
    raw = lookupNestedString(catalogs[language], singularPath)
  }
  if (raw === undefined) {
    raw = lookupNestedString(catalogs[language], path)
  }
  if (raw === undefined && trySingular) {
    raw = lookupNestedString(catalogs[DEFAULT_FALLBACK_LANGUAGE], singularPath)
  }
  if (raw === undefined) {
    raw = lookupNestedString(catalogs[DEFAULT_FALLBACK_LANGUAGE], path)
  }
  if (raw === undefined) return path
  return formatMessage(raw, params)
}
