import { computed, watch } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { parsePublicSeoPath } from '~~/shared/site-routes'

export default defineNuxtPlugin(() => {
  const route = useRoute()
  const { currentLang, syncClientLanguage } = useI18n()

  if (import.meta.client) {
    syncClientLanguage()
    watch(() => route.fullPath, () => {
      syncClientLanguage()
    })
  }

  const htmlLang = computed(() => {
    const parsed = parsePublicSeoPath(route.path || '/')
    if (parsed.isPublicSeo && parsed.locale) return parsed.locale
    return currentLang.value
  })

  useHead({ htmlAttrs: { lang: htmlLang } })
})
