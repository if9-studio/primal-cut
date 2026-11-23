const isCloudflareBuild = process.env.CLOUDFLARE_BUILD === '1' || process.env.CF_PAGES === '1'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~~/assets/css/main.css'],
  routeRules: {
    '/app': { ssr: false },
  },
  nitro: {
    ...(isCloudflareBuild ? { preset: 'cloudflare_pages' } : {}),
  },
  app: {
    head: {
      title: 'PrimalCut — Free Local PNG to macOS .icns Icon Generator',
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'alternate icon', href: '/favicon.ico' },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
  vite: {
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['buffer', 'png2icons'],
    },
  },
})
