<script setup lang="ts">
import { computed } from 'vue'
import { catalogFor } from '~/composables/useI18n'
import {
  SITE_ORIGIN,
  WORKSPACE_ENTRY_PATH,
  buildPrimalCutAlternates,
  buildPrimalCutJsonLd,
  siteLocalePath,
  type SiteLocale,
} from '~~/shared/site-routes'
import If9Text from './If9Text.vue'
import SiteFooter from './SiteFooter.vue'
import SiteHeader from './SiteHeader.vue'
import UiIcon from './UiIcon.vue'

const props = withDefaults(
  defineProps<{
    locale?: SiteLocale
  }>(),
  { locale: 'en' },
)

const requestUrl = useRequestURL()
const siteOrigin = computed(() => {
  const origin = requestUrl?.origin
  if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) return SITE_ORIGIN
  return origin
})

const c = computed(() => catalogFor(props.locale))
const page = computed(() => c.value.vsCompare)
const seoLinks = computed(() =>
  buildPrimalCutAlternates('/vs-iconutil-image2icon', props.locale, siteOrigin.value),
)

const jsonLdString = computed(() =>
  JSON.stringify(
    buildPrimalCutJsonLd({
      origin: siteOrigin.value,
      locale: props.locale,
      barePath: '/vs-iconutil-image2icon',
      title: page.value.metaTitle,
      description: page.value.metaDescription,
      breadcrumbName: page.value.breadcrumb,
    }),
  ).replace(/</g, '\\u003c'),
)

useHead(() => ({
  htmlAttrs: { lang: props.locale },
  title: page.value.metaTitle,
  titleTemplate: null,
  link: [
    { rel: 'canonical' as const, href: seoLinks.value.canonical },
    ...seoLinks.value.alternates.map((alt) => ({
      rel: 'alternate' as const,
      hreflang: alt.hreflang,
      href: alt.href,
    })),
  ],
  script: [
    {
      type: 'application/ld+json' as const,
      innerHTML: jsonLdString.value,
    },
  ],
}))

useSeoMeta({
  description: () => page.value.metaDescription,
  ogTitle: () => page.value.metaTitle,
  ogDescription: () => page.value.metaDescription,
  ogType: 'article',
  ogUrl: () => seoLinks.value.canonical,
  twitterCard: 'summary_large_image',
})

const homeHref = computed(() => siteLocalePath('/', props.locale))
const workbenchHref = computed(() =>
  props.locale !== 'en'
    ? `${WORKSPACE_ENTRY_PATH}?lang=${encodeURIComponent(props.locale)}`
    : WORKSPACE_ENTRY_PATH,
)
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-[#F8FAFC] text-slate-700 selection:bg-sky-100 selection:text-sky-900">
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div class="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:6rem_4rem]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_180px,#E0F2FE,transparent)] opacity-60"></div>
    </div>

    <SiteHeader :locale="props.locale" bare-path="/vs-iconutil-image2icon" />

    <main class="relative z-10 mx-auto w-full max-w-5xl flex-1 space-y-12 px-5 py-12 sm:py-16">
      <div class="max-w-3xl space-y-3">
        <p class="font-mono text-xs tracking-wide text-slate-400">{{ page.eyebrow }}</p>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {{ page.title }}
        </h1>
        <p class="text-sm leading-7 text-slate-600 sm:text-base">
          {{ page.lead }}
        </p>
      </div>

      <!-- Comparison Table -->
      <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
        <table class="w-full border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
              <th class="px-5 py-3.5 font-semibold">{{ page.tableHead[0] }}</th>
              <th class="px-5 py-3.5 font-semibold">{{ page.tableHead[1] }}</th>
              <th class="px-5 py-3.5 font-semibold">{{ page.tableHead[2] }}</th>
              <th class="px-5 py-3.5 font-semibold text-slate-900">{{ page.tableHead[3] }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs leading-6 sm:text-sm">
            <tr v-for="row in page.rows" :key="row.label" class="align-top">
              <td class="px-5 py-3.5 font-medium text-slate-800">{{ row.label }}</td>
              <td class="px-5 py-3.5 text-slate-600">{{ row.colA }}</td>
              <td class="px-5 py-3.5 text-slate-600">{{ row.colB }}</td>
              <td class="px-5 py-3.5 text-slate-800">{{ row.colC }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Decision Cards -->
      <section class="grid gap-6 lg:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
          <h2 class="text-lg font-semibold tracking-tight text-slate-900">
            {{ page.whenPrimalCutTitle }}
          </h2>
          <ul class="mt-4 space-y-3.5 text-sm leading-6 text-slate-600">
            <li v-for="item in page.whenPrimalCutItems" :key="item.bold">
              <strong class="font-semibold text-slate-900">{{ item.bold }}</strong> — {{ item.body }}
            </li>
          </ul>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white/85 p-6 sm:p-7">
          <h2 class="text-lg font-semibold tracking-tight text-slate-900">
            {{ page.whenOtherTitle }}
          </h2>
          <p class="mt-1.5 text-xs text-slate-500">{{ page.whenOtherLead }}</p>
          <ul class="mt-4 space-y-3.5 text-sm leading-6 text-slate-600">
            <li v-for="item in page.whenOtherItems" :key="item.bold">
              <strong class="font-semibold text-slate-900">{{ item.bold }}</strong> — {{ item.body }}
            </li>
          </ul>
        </div>
      </section>

      <!-- CTA -->
      <section class="rounded-2xl border border-slate-200 bg-white p-7 sm:p-9">
        <div class="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div class="space-y-1.5">
            <h2 class="text-xl font-semibold tracking-tight text-slate-900">
              {{ page.ctaTitle }}
            </h2>
            <p class="text-sm text-slate-600">
              <If9Text :text="page.ctaBody" />
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <NuxtLink
              :to="homeHref"
              class="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              {{ page.ctaTryTool }}
            </NuxtLink>
            <NuxtLink
              :to="workbenchHref"
              class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              <UiIcon name="hard-drive" :size="15" />
              <span>{{ page.ctaOpenWorkbench }}</span>
            </NuxtLink>
          </div>
        </div>
      </section>
    </main>

    <SiteFooter :locale="props.locale" />
  </div>
</template>
