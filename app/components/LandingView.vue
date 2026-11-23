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
import PrimalCutTool from './PrimalCutTool.vue'
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
const seoLinks = computed(() => buildPrimalCutAlternates('/', props.locale, siteOrigin.value))

const jsonLdString = computed(() =>
  JSON.stringify(
    buildPrimalCutJsonLd({
      origin: siteOrigin.value,
      locale: props.locale,
      barePath: '/',
      title: c.value.landing.metaTitle,
      description: c.value.landing.metaDescription,
      faqItems: c.value.landing.faqItems,
    }),
  ).replace(/</g, '\\u003c'),
)

useHead(() => ({
  htmlAttrs: { lang: props.locale },
  title: c.value.landing.metaTitle,
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
  description: () => c.value.landing.metaDescription,
  ogTitle: () => c.value.landing.metaTitle,
  ogDescription: () => c.value.landing.metaDescription,
  ogType: 'website',
  ogUrl: () => seoLinks.value.canonical,
  twitterCard: 'summary_large_image',
})

const vsCompareHref = computed(() => siteLocalePath('/vs-iconutil-image2icon', props.locale))
const workbenchHref = computed(() =>
  props.locale !== 'en'
    ? `${WORKSPACE_ENTRY_PATH}?lang=${encodeURIComponent(props.locale)}`
    : WORKSPACE_ENTRY_PATH,
)
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-[#F8FAFC] text-slate-700 selection:bg-sky-100 selection:text-sky-900">
    <!-- Subtle Grid & Radial Background -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div class="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:6rem_4rem]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_180px,#E0F2FE,transparent)] opacity-70"></div>
    </div>

    <SiteHeader :locale="props.locale" bare-path="/" />

    <main class="relative z-10 mx-auto w-full max-w-5xl flex-1 space-y-16 px-5 py-12 sm:py-16">
      <!-- Hero & On-Page Converter Tool -->
      <section class="mx-auto max-w-2xl space-y-8">
        <div class="space-y-3 text-center">
          <div class="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/70 px-3.5 py-1 text-xs font-medium text-sky-900">
            <span>{{ c.landing.heroBadge }}</span>
          </div>
          <h1 class="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {{ c.brand.name }}<span v-if="props.locale === 'zh-CN' || props.locale === 'zh-TW'" class="ml-2 font-mono text-lg font-normal text-slate-400">PrimalCut</span>
          </h1>
          <p class="text-base font-medium text-slate-700 sm:text-lg">
            {{ c.landing.heroTitle }}
          </p>
          <p class="mx-auto max-w-xl text-sm leading-6 text-slate-500">
            {{ c.landing.heroSubtitle }}
          </p>
        </div>

        <PrimalCutTool :locale="props.locale" />
      </section>

      <!-- Technical Specs -->
      <section class="space-y-8">
        <div class="max-w-2xl space-y-2">
          <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
            {{ c.landing.specsTitle }}
          </h2>
          <p class="text-sm leading-6 text-slate-600 sm:text-base">
            {{ c.landing.specsLead }}
          </p>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <article
            v-for="item in c.landing.specs"
            :key="item.title"
            class="rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-xs"
          >
            <span class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              <UiIcon name="hash" :size="11" class="text-slate-400" />
              <span>{{ item.tag }}</span>
            </span>
            <h3 class="mt-3 text-base font-semibold text-slate-900">{{ item.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-slate-600">{{ item.desc }}</p>
          </article>
        </div>
      </section>

      <!-- 3-Step Workflow -->
      <section class="space-y-8 rounded-3xl border border-slate-200/80 bg-white/85 p-7 sm:p-9">
        <div class="max-w-2xl space-y-2">
          <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
            {{ c.landing.workflowTitle }}
          </h2>
          <p class="text-sm leading-6 text-slate-600">
            {{ c.landing.workflowLead }}
          </p>
        </div>

        <div class="grid gap-6 md:grid-cols-3">
          <div
            v-for="step in c.landing.steps"
            :key="step.num"
            class="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-5"
          >
            <div class="font-mono text-xs font-semibold text-sky-700 tabular-nums">{{ step.num }}</div>
            <h3 class="text-base font-semibold text-slate-900">{{ step.title }}</h3>
            <p class="text-sm leading-6 text-slate-600">{{ step.desc }}</p>
          </div>
        </div>
      </section>

      <!-- FAQ -->
      <section class="space-y-8">
        <div class="max-w-2xl space-y-2">
          <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
            {{ c.landing.faqTitle }}
          </h2>
          <p class="text-sm leading-6 text-slate-600">
            {{ c.landing.faqLead }}
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <article
            v-for="faq in c.landing.faqItems"
            :key="faq.q"
            class="rounded-2xl border border-slate-200/80 bg-white/85 p-6"
          >
            <h3 class="text-sm font-semibold leading-6 text-slate-900 sm:text-base">{{ faq.q }}</h3>
            <p class="mt-2 text-sm leading-6 text-slate-600">{{ faq.a }}</p>
          </article>
        </div>
      </section>

      <!-- Callouts: Comparison & Workbench -->
      <section class="grid gap-5 md:grid-cols-2">
        <div class="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200/80 bg-white/90 p-6 sm:p-7">
          <div class="space-y-2">
            <h2 class="text-lg font-semibold text-slate-900">{{ c.landing.compareCalloutTitle }}</h2>
            <p class="text-sm leading-6 text-slate-600">{{ c.landing.compareCalloutBody }}</p>
          </div>
          <div>
            <NuxtLink
              :to="vsCompareHref"
              class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100"
            >
              <span>{{ c.landing.compareCalloutCta }}</span>
              <UiIcon name="external" :size="13" />
            </NuxtLink>
          </div>
        </div>

        <div class="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200/80 bg-white/90 p-6 sm:p-7">
          <div class="space-y-2">
            <h2 class="text-lg font-semibold text-slate-900">{{ c.landing.workbenchCalloutTitle }}</h2>
            <p class="text-sm leading-6 text-slate-600">{{ c.landing.workbenchCalloutBody }}</p>
          </div>
          <div>
            <NuxtLink
              :to="workbenchHref"
              class="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
            >
              <span>{{ c.landing.workbenchCalloutCta }}</span>
              <UiIcon name="external" :size="13" />
            </NuxtLink>
          </div>
        </div>
      </section>
    </main>

    <SiteFooter :locale="props.locale" />
  </div>
</template>
