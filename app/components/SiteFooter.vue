<script setup lang="ts">
import { computed } from 'vue'
import { catalogFor } from '~/composables/useI18n'
import { if9HubHref, siteLocalePath, WORKSPACE_ENTRY_PATH, type SiteLocale } from '~~/shared/site-routes'
import If9Text from './If9Text.vue'

interface SeoNetworkProduct {
  slug?: string
  title: string
  anchor_label: string
  href: string
}

const props = withDefaults(
  defineProps<{
    locale?: SiteLocale
  }>(),
  { locale: 'en' },
)

const year = new Date().getFullYear()
const c = computed(() => catalogFor(props.locale))

const { data: siteCtx } = await useAsyncData<{ networkProducts: SeoNetworkProduct[] }>(
  () => `primalcut-seo-network:${props.locale}`,
  async () => {
    try {
      return await $fetch<{ networkProducts: SeoNetworkProduct[] }>('/api/public/site-context', {
        query: { lang: props.locale },
      })
    } catch {
      return { networkProducts: [] }
    }
  },
  { default: () => ({ networkProducts: [] }) },
)

const peers = computed(() => siteCtx.value?.networkProducts ?? [])
const vsCompareHref = computed(() => siteLocalePath('/vs-iconutil-image2icon', props.locale))
const workbenchHref = computed(() =>
  props.locale !== 'en'
    ? `${WORKSPACE_ENTRY_PATH}?lang=${encodeURIComponent(props.locale)}`
    : WORKSPACE_ENTRY_PATH,
)
const displayBrand = computed(() =>
  props.locale === 'zh-CN' || props.locale === 'zh-TW' ? `${c.value.brand.name} PrimalCut` : 'PrimalCut',
)
</script>

<template>
  <footer class="border-t border-slate-200/80 bg-white/90">
    <div class="mx-auto max-w-5xl space-y-6 px-5 py-10">
      <div v-if="peers.length > 0" class="space-y-2.5 border-b border-slate-100 pb-6">
        <p class="font-mono text-xs tracking-wide text-slate-400">
          <If9Text :text="c.footer.moreFromIf9" />
        </p>
        <div class="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
          <a
            v-for="item in peers"
            :key="item.href"
            :href="item.href"
            class="transition-colors hover:text-slate-900"
          >
            {{ item.anchor_label || item.title }}
          </a>
        </div>
      </div>

      <div class="flex flex-col justify-between gap-4 text-xs text-slate-500 sm:flex-row sm:items-center">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span class="font-medium text-slate-700 tabular-nums">© {{ year }} {{ displayBrand }}</span>
          <span class="text-slate-300">·</span>
          <NuxtLink :to="vsCompareHref" class="transition-colors hover:text-slate-800">
            {{ c.footer.vsCompareLink }}
          </NuxtLink>
          <span class="text-slate-300">·</span>
          <NuxtLink :to="workbenchHref" class="transition-colors hover:text-slate-800">
            {{ c.footer.workbenchLink }}
          </NuxtLink>
        </div>

        <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
          <a :href="if9HubHref(props.locale, '/legal/privacy')" target="_blank" rel="noopener" class="transition-colors hover:text-slate-800">
            {{ c.footer.privacy }}
          </a>
          <a :href="if9HubHref(props.locale, '/legal/terms')" target="_blank" rel="noopener" class="transition-colors hover:text-slate-800">
            {{ c.footer.terms }}
          </a>
          <a :href="if9HubHref(props.locale, '/legal/refund')" target="_blank" rel="noopener" class="transition-colors hover:text-slate-800">
            {{ c.footer.refund }}
          </a>
          <a :href="if9HubHref(props.locale)" target="_blank" rel="noopener" class="font-medium text-slate-700 transition-colors hover:text-slate-900">
            <If9Text :text="c.footer.madeBy" />
          </a>
        </div>
      </div>

      <p class="text-[11px] text-slate-400">
        {{ c.footer.localTrust }}
      </p>
    </div>
  </footer>
</template>
