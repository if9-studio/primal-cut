<script setup lang="ts">
import { computed } from 'vue'
import { catalogFor } from '~/composables/useI18n'
import { siteLocalePath, WORKSPACE_ENTRY_PATH, type PublicBarePath, type SiteLocale } from '~~/shared/site-routes'
import LocaleSelect from './LocaleSelect.vue'
import UiIcon from './UiIcon.vue'

const props = defineProps<{
  locale: SiteLocale
  barePath: PublicBarePath
}>()

const c = computed(() => catalogFor(props.locale))
const homeHref = computed(() => siteLocalePath('/', props.locale))
const vsCompareHref = computed(() => siteLocalePath('/vs-iconutil-image2icon', props.locale))
const workbenchHref = computed(() =>
  props.locale !== 'en'
    ? `${WORKSPACE_ENTRY_PATH}?lang=${encodeURIComponent(props.locale)}`
    : WORKSPACE_ENTRY_PATH,
)
const showLatinSub = computed(() => props.locale === 'zh-CN' || props.locale === 'zh-TW')
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
    <div class="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-2">
      <NuxtLink :to="homeHref" class="flex shrink-0 items-center gap-2.5" :aria-label="c.nav.homeAria">
        <span class="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-900 text-white shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="4" y="4" width="16" height="16" rx="4" />
            <path d="M9 9h6v6H9z" />
          </svg>
        </span>
        <span class="text-[15px] font-semibold tracking-tight text-slate-900">{{ c.brand.name }}</span>
        <span v-if="showLatinSub" class="font-mono text-xs text-slate-400">PrimalCut</span>
      </NuxtLink>

      <nav class="flex flex-wrap items-center gap-2 sm:gap-2.5" :aria-label="c.nav.mainAria">
        <NuxtLink
          v-if="props.barePath !== '/'"
          :to="homeHref"
          class="hidden rounded-full px-3 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 md:inline-flex"
        >
          {{ c.nav.backHome }}
        </NuxtLink>

        <NuxtLink
          :to="vsCompareHref"
          class="hidden rounded-full px-3.5 py-1.5 text-xs transition-colors lg:inline-flex"
          :class="props.barePath === '/vs-iconutil-image2icon' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
        >
          {{ c.nav.vsCompare }}
        </NuxtLink>

        <LocaleSelect
          :locale="props.locale"
          :bare-path="props.barePath"
          :label="c.nav.langMenuLabel"
        />

        <NuxtLink
          :to="workbenchHref"
          class="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
        >
          <span>{{ c.nav.openWorkbench }}</span>
          <UiIcon name="external" :size="13" />
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
