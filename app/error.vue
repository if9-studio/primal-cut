<script setup lang="ts">
import { computed } from 'vue'
import type { NuxtError } from '#app'
import { useI18n } from '~/composables/useI18n'
import { siteLocalePath } from '~~/shared/site-routes'

const props = defineProps<{ error: NuxtError }>()
const { t, productName, currentLang } = useI18n()

const is404 = computed(() => props.error.statusCode === 404)

useHead(() => ({
  title: `${props.error.statusCode} · ${productName.value}`,
  titleTemplate: null,
}))

const face = computed(() => (is404.value ? '(・_・;)ゞ' : '(×_×)'))
const headline = computed(() =>
  is404.value ? t('errorPage.notFoundTitle') : t('errorPage.crashTitle'),
)
const sub = computed(() =>
  is404.value ? t('errorPage.notFoundDesc') : t('errorPage.crashDesc'),
)

function backHome() {
  clearError({ redirect: siteLocalePath('/', currentLang.value) })
}

function retry() {
  if (import.meta.client) window.location.reload()
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4 text-center text-slate-700">
    <div class="font-mono text-6xl font-light text-slate-400 tabular-nums">
      {{ error.statusCode }}
    </div>

    <div class="mt-3 flex items-baseline gap-2">
      <span class="font-mono text-sm text-slate-500">{{ face }}</span>
      <span class="text-base font-medium text-slate-800">{{ headline }}</span>
    </div>
    <p class="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">{{ sub }}</p>

    <div class="mt-7 flex flex-wrap justify-center gap-3">
      <button
        type="button"
        class="rounded-full bg-slate-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        @click="backHome"
      >
        {{ t('errorPage.backHome') }}
      </button>
      <button
        v-if="!is404"
        type="button"
        class="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
        @click="retry"
      >
        {{ t('common.retry') }}
      </button>
    </div>

    <p class="mt-10 font-mono text-xs text-slate-400 tabular-nums">
      E({{ error.statusCode }}) · PrimalCut
    </p>
  </div>
</template>
