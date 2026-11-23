import { computed } from 'vue'
import { useState, useRequestHeaders, useRoute } from '#imports'
import en from '~~/Locales/en.json'
import ja from '~~/Locales/ja.json'
import zhCN from '~~/Locales/zh-CN.json'
import zhTW from '~~/Locales/zh-TW.json'
import ko from '~~/Locales/ko.json'
import de from '~~/Locales/de.json'
import fr from '~~/Locales/fr.json'
import es from '~~/Locales/es.json'
import {
  LANGUAGES,
  LANGUAGE_LABELS,
  LANGUAGE_SHORT_BADGES,
  lookupNestedValue,
  normalizeLanguage,
  normalizeLanguagePreference,
  productNameFor,
  readEnvLanguageCookie,
  readLanguageCookie,
  readLanguagePreferenceCookie,
  resolveCatalogMessage,
  resolveSystemLanguage,
  type Language,
  type LanguagePreference,
} from '~~/shared/language'
import { parsePublicSeoPath } from '~~/shared/site-routes'

export type LocaleCatalog = typeof zhCN

export const messages: Readonly<Record<Language, LocaleCatalog>> = {
  'en': en,
  'ja': ja,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'ko': ko,
  'de': de,
  'fr': fr,
  'es': es,
}

export interface AvailableLanguageOption {
  code: LanguagePreference
  name: string
  lang: string
  badge: string
}

export function catalogFor(locale: Language): LocaleCatalog {
  return messages[locale] ?? messages.en
}

export function tFor(
  locale: Language,
  path: string,
  params?: Readonly<Record<string, string | number | null | undefined>>,
): string {
  return resolveCatalogMessage(messages, locale, path, params)
}

export function listFor<T>(locale: Language, path: string): T[] {
  const val = lookupNestedValue(catalogFor(locale), path)
  return Array.isArray(val) ? (val as T[]) : []
}

function readServerEnvLanguage(): Language | null {
  if (typeof process === 'undefined') return null
  return normalizeLanguage(process.env?.PRIMALCUT_LANGUAGE)
}

function readRouteQueryLanguage(path: string, langQuery: unknown): Language | null {
  if (parsePublicSeoPath(path).isPublicSeo) return null
  const raw = Array.isArray(langQuery) ? langQuery[0] : langQuery
  return normalizeLanguage(raw)
}

export function useI18n(forcedLocale?: () => Language | undefined) {
  const route = useRoute()

  const languagePreference = useState<LanguagePreference>('primalcut-language-pref', () => {
    if (import.meta.server) {
      const headers = useRequestHeaders(['cookie'])
      return readLanguagePreferenceCookie(headers.cookie || '') ?? 'auto'
    }
    let saved = ''
    try {
      saved = localStorage.getItem('primalcut_lang') || ''
    } catch {
      /* Storage unavailable */
    }
    const cookieStr = typeof document !== 'undefined' ? document.cookie : ''
    return normalizeLanguagePreference(saved) ?? readLanguagePreferenceCookie(cookieStr) ?? 'auto'
  })

  const currentLang = useState<Language>('primalcut-language', () => {
    const queryLang = readRouteQueryLanguage(route?.path || '/', route?.query?.lang)
    if (import.meta.server) {
      const envLang = readServerEnvLanguage()
      if (envLang) return envLang
      const headers = useRequestHeaders(['cookie'])
      const cookie = headers.cookie || ''
      const envCookieLang = readEnvLanguageCookie(cookie)
      if (envCookieLang) return envCookieLang
      if (queryLang) return queryLang
      // 严禁在匿名 SSR 读取 Accept-Language：未知回退 English ('en')
      return readLanguageCookie(cookie) ?? 'en'
    }
    const cookieStr = typeof document !== 'undefined' ? document.cookie : ''
    const envCookieLang = readEnvLanguageCookie(cookieStr)
    if (envCookieLang) return envCookieLang
    if (queryLang) return queryLang
    if (languagePreference.value !== 'auto') return languagePreference.value
    const browserTags = typeof navigator !== 'undefined'
      ? (navigator.languages?.length ? navigator.languages : [navigator.language])
      : []
    return resolveSystemLanguage(browserTags)
  })

  const effectiveLang = computed<Language>(() => forcedLocale?.() ?? currentLang.value)

  const syncClientLanguage = () => {
    if (!import.meta.client) return
    const cookieStr = typeof document !== 'undefined' ? document.cookie : ''
    const envCookieLang = readEnvLanguageCookie(cookieStr)
    if (envCookieLang) {
      currentLang.value = envCookieLang
      if (typeof document !== 'undefined') document.documentElement.lang = envCookieLang
      return
    }
    const pathname = route?.path || (typeof window !== 'undefined' ? window.location.pathname : '/')
    const queryLang = readRouteQueryLanguage(pathname, route?.query?.lang)
    let saved = ''
    try {
      saved = localStorage.getItem('primalcut_lang') || ''
    } catch {
      /* Ignore storage errors */
    }
    const pref = normalizeLanguagePreference(saved) ?? readLanguagePreferenceCookie(cookieStr) ?? 'auto'
    languagePreference.value = pref
    if (queryLang) {
      currentLang.value = queryLang
    } else if (pref !== 'auto') {
      currentLang.value = pref
    } else {
      const browserTags = typeof navigator !== 'undefined'
        ? (navigator.languages?.length ? navigator.languages : [navigator.language])
        : []
      currentLang.value = resolveSystemLanguage(browserTags)
    }
    if (typeof document !== 'undefined' && !parsePublicSeoPath(pathname).isPublicSeo) {
      document.documentElement.lang = currentLang.value
    }
  }

  const t = (path: string, params?: Readonly<Record<string, string | number | null | undefined>>): string =>
    resolveCatalogMessage(messages, effectiveLang.value, path, params)

  const setLanguage = (input: string) => {
    const pref = normalizeLanguagePreference(input)
    if (!pref) return
    languagePreference.value = pref
    const cookieStr = import.meta.client && typeof document !== 'undefined' ? document.cookie : ''
    const envCookieLang = import.meta.client ? readEnvLanguageCookie(cookieStr) : null
    if (envCookieLang) {
      currentLang.value = envCookieLang
    } else if (pref === 'auto') {
      const browserTags = import.meta.client && typeof navigator !== 'undefined'
        ? (navigator.languages?.length ? navigator.languages : [navigator.language])
        : []
      currentLang.value = resolveSystemLanguage(browserTags)
    } else {
      currentLang.value = pref
    }

    if (import.meta.client) {
      try {
        localStorage.setItem('primalcut_lang', pref)
      } catch {
        /* Cookie remains usable */
      }
      if (typeof document !== 'undefined') {
        if (pref === 'auto') {
          document.cookie = 'primalcut_lang=; path=/; Max-Age=0; SameSite=Lax'
        } else {
          document.cookie = `primalcut_lang=${encodeURIComponent(pref)}; path=/; Max-Age=31536000; SameSite=Lax`
        }
        const pathname = typeof window !== 'undefined' ? window.location.pathname : (route?.path || '/')
        if (!parsePublicSeoPath(pathname).isPublicSeo) {
          document.documentElement.lang = currentLang.value
        }
      }
    }
  }

  const availableLanguages = computed<AvailableLanguageOption[]>(() => [
    {
      code: 'auto',
      name: t('settings.languageAuto'),
      lang: effectiveLang.value,
      badge: 'AUTO',
    },
    ...LANGUAGES.map((code) => ({
      code,
      name: LANGUAGE_LABELS[code],
      lang: code,
      badge: LANGUAGE_SHORT_BADGES[code],
    })),
  ])

  const productName = computed(() => productNameFor(effectiveLang.value))

  return {
    t,
    currentLang: effectiveLang,
    languagePreference,
    setLanguage,
    syncClientLanguage,
    availableLanguages,
    productName,
  }
}
