<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  LANGUAGES,
  LANGUAGE_LABELS,
  normalizeLanguage,
  orderLocales,
  timeZoneLocale,
  type Language,
} from '~~/shared/language'
import { parsePublicSeoPath, siteLocalePath, type PublicBarePath } from '~~/shared/site-routes'
import { useI18n } from '~/composables/useI18n'
import UiIcon from './UiIcon.vue'

const props = defineProps<{
  locale?: Language
  barePath?: PublicBarePath
  label: string
}>()

const route = useRoute()
const { currentLang, setLanguage } = useI18n()

const orderedLocales = ref<Language[]>([...LANGUAGES])

onMounted(() => {
  const navLangs = typeof navigator !== 'undefined'
    ? (navigator.languages?.length ? navigator.languages : [navigator.language])
    : []
  let tzLang: Language | null = null
  try {
    tzLang = timeZoneLocale(Intl.DateTimeFormat().resolvedOptions().timeZone)
  } catch {
    tzLang = null
  }
  orderedLocales.value = orderLocales([...navLangs, tzLang])
})

const activeValue = computed<Language>(() => props.locale ?? currentLang.value)

function handleChange(event: Event) {
  const next = normalizeLanguage((event.target as HTMLSelectElement).value)
  if (!next) return

  const parsed = parsePublicSeoPath(route.path || '/')
  const targetBare = props.barePath ?? (parsed.isPublicSeo ? (parsed.barePath as PublicBarePath) : null)

  if (targetBare) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(route.query || {})) {
      if (k === 'lang' || v === undefined || v === null) continue
      if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === 'string') params.append(k, item)
        }
      } else if (typeof v === 'string') {
        params.set(k, v)
      }
    }
    const qs = params.toString()
    const dest = siteLocalePath(targetBare, next)
    void navigateTo(qs ? `${dest}?${qs}` : dest)
    return
  }

  setLanguage(next)
  void navigateTo({ path: route.path, query: { ...route.query, lang: next } }, { replace: true })
}
</script>

<template>
  <label class="relative inline-flex items-center text-slate-600">
    <UiIcon
      name="globe"
      :size="14"
      :stroke-width="1.75"
      class="pointer-events-none absolute left-3 text-slate-400"
    />
    <select
      :value="activeValue"
      :aria-label="props.label"
      data-testid="locale-select"
      class="h-8 cursor-pointer appearance-none rounded-full border border-slate-200 bg-white pr-7 pl-8 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus-visible:border-slate-500"
      @change="handleChange"
    >
      <option
        v-for="loc in orderedLocales"
        :key="loc"
        :value="loc"
        :lang="loc"
      >
        {{ LANGUAGE_LABELS[loc] }}
      </option>
    </select>
    <UiIcon
      name="chevron-down"
      :size="13"
      :stroke-width="1.75"
      class="pointer-events-none absolute right-2.5 text-slate-400"
    />
  </label>
</template>
