<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '~/composables/useI18n'
import { siteLocalePath } from '~~/shared/site-routes'
import If9Text from '~/components/If9Text.vue'
import LocaleSelect from '~/components/LocaleSelect.vue'
import PrimalCutTool from '~/components/PrimalCutTool.vue'
import UiIcon from '~/components/UiIcon.vue'

const { t, currentLang, productName } = useI18n()

const homeHref = computed(() => siteLocalePath('/', currentLang.value))
const showLatinSub = computed(() => currentLang.value === 'zh-CN' || currentLang.value === 'zh-TW')

useHead(() => ({
  title: `${productName.value} · ${t('nav.openWorkbench')}`,
  titleTemplate: null,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
}))
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-[#F8FAFC] text-slate-700 selection:bg-sky-100 selection:text-sky-900">
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div class="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:6rem_4rem]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_180px,#E0F2FE,transparent)] opacity-70"></div>
    </div>

    <header class="relative z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div class="mx-auto flex min-h-14 max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-2">
        <div class="flex items-center gap-3">
          <NuxtLink :to="homeHref" class="flex items-center gap-2 text-slate-900">
            <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="4" />
                <path d="M9 9h6v6H9z" />
              </svg>
            </span>
            <span class="text-sm font-semibold tracking-tight">{{ productName }}</span>
            <span v-if="showLatinSub" class="font-mono text-xs text-slate-400">PrimalCut</span>
          </NuxtLink>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <LocaleSelect :label="t('nav.langMenuLabel')" />
          <NuxtLink
            :to="homeHref"
            class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <span>{{ t('nav.backToSite') }}</span>
            <UiIcon name="external" :size="12" />
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-10">
      <PrimalCutTool :allow-language-setting="true" />
    </main>

    <footer class="relative z-10 py-6 text-center text-xs text-slate-400">
      <If9Text :text="t('footer.madeBy')" /> · {{ t('footer.localTrust') }}
    </footer>
  </div>
</template>
