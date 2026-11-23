import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import { readFile, readdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import * as Vue from 'vue'
import { renderToString } from 'vue/server-renderer'
import { parse, compileScript } from '@vue/compiler-sfc'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(new URL('../package.json', import.meta.url))
const { build } = require('esbuild')

const tempDir = await mkdtemp(path.join(tmpdir(), 'primalcut-seo-gate-'))
after(() => rm(tempDir, { recursive: true, force: true }))
let seq = 0

async function loadTs(file) {
  const fullPath = path.join(root, file)
  const result = await build({
    stdin: {
      contents: await readFile(fullPath, 'utf8'),
      resolveDir: path.dirname(fullPath),
      loader: 'ts',
    },
    alias: {
      '~~': root,
      '~': path.join(root, 'app'),
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    plugins: [
      {
        name: 'external-bare-packages',
        setup(builder) {
          builder.onResolve({ filter: /^[^.~#/]/ }, (args) => {
            if (args.path.startsWith('node:')) return { path: args.path, external: true }
            return { path: import.meta.resolve(args.path), external: true }
          })
        },
      },
    ],
  })
  const out = path.join(tempDir, `ts-${++seq}.mjs`)
  await writeFile(out, result.outputFiles[0].text)
  return await import(pathToFileURL(out).href)
}

async function compileSfcBundle(entryRelative) {
  const nuxtStub = `
    import { ref } from 'vue';
    export const useState = (_k, init) => ref(init ? init() : null);
    export const useRequestHeaders = () => ({});
    export const useRequestURL = () => new URL('https://primal-cut.if9.cool/');
    export const useRoute = () => globalThis.__seoRoute || { path: '/', query: {} };
    export const useHead = input => { globalThis.__seoHeads?.push(typeof input === 'function' ? input() : input); };
    export const useSeoMeta = () => {};
    export const useAsyncData = (_k, _f, opts) => ({ data: ref(opts?.default ? opts.default() : null) });
    export const navigateTo = () => {};
  `
  const emptyLibStub = `export default {};`
  const result = await build({
    entryPoints: [path.join(root, entryRelative)],
    alias: {
      '~~': root,
      '~': path.join(root, 'app'),
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    define: { 'import.meta.server': 'true', 'import.meta.client': 'false' },
    logLevel: 'silent',
    plugins: [
      {
        name: 'ssr-sfc-compiler',
        setup(builder) {
          builder.onResolve({ filter: /^#imports$/ }, () => ({ path: 'nuxt-stub', namespace: 'stub' }))
          builder.onResolve({ filter: /^vue-router$/ }, () => ({ path: 'nuxt-stub', namespace: 'stub' }))
          builder.onResolve({ filter: /^(jszip|png2icons\/lib\/UZIP)$/ }, () => ({ path: 'empty-lib', namespace: 'empty-lib' }))
          builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: nuxtStub, loader: 'js' }))
          builder.onLoad({ filter: /.*/, namespace: 'empty-lib' }, () => ({ contents: emptyLibStub, loader: 'js' }))
          builder.onResolve({ filter: /^[^./~]/ }, (args) => {
            if (args.path.startsWith('node:')) return { path: args.path, external: true }
            return { path: import.meta.resolve(args.path), external: true }
          })
          builder.onLoad({ filter: /\.vue$/ }, async (args) => {
            const raw = await readFile(args.path, 'utf8')
            const { descriptor, errors } = parse(raw, { filename: args.path })
            assert.deepEqual(errors, [], `SFC parse error in ${args.path}`)
            const id = path.basename(args.path)
            const compiled = compileScript(descriptor, {
              id,
              inlineTemplate: true,
            })
            return { contents: compiled.content, loader: 'ts', resolveDir: path.dirname(args.path) }
          })
        },
      },
    ],
  })
  const out = path.join(tempDir, `sfc-${++seq}.mjs`)
  await writeFile(out, result.outputFiles[0].text)
  return await import(pathToFileURL(out).href)
}

const CJK_HAN_RE = /[\u3400-\u9fff\uf900-\ufaff]/u
const FLAG_EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}]/u
const NON_HAN_LOCALES = ['en', 'ko', 'de', 'fr', 'es']
const NON_CHINESE_LOCALES = ['en', 'ja', 'ko', 'de', 'fr', 'es']

function stripAllowedEndonyms(text) {
  return text
    .replaceAll('简体中文', '')
    .replaceAll('繁體中文', '')
    .replaceAll('日本語', '')
}

function extractPlaceholders(str) {
  return [...String(str).matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]).sort()
}

function flattenStrings(obj, prefix = '') {
  const out = {}
  for (const [key, val] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (typeof val === 'string') {
      out[full] = val
    } else if (Array.isArray(val)) {
      val.forEach((item, idx) => {
        if (typeof item === 'string') out[`${full}[${idx}]`] = item
        else if (item && typeof item === 'object') Object.assign(out, flattenStrings(item, `${full}[${idx}]`))
      })
    } else if (val && typeof val === 'object') {
      Object.assign(out, flattenStrings(val, full))
    }
  }
  return out
}

const {
  LANGUAGES,
  LANGUAGE_LABELS,
  PLURAL_ONE_LANGUAGES,
  formatMessage,
  lookupNestedString,
  normalizeLanguage,
  normalizeLanguagePreference,
  orderLocales,
  productNameFor,
  resolveCatalogMessage,
  resolveLanguage,
  resolveSystemLanguage,
  timeZoneLocale,
} = await loadTs('shared/language.ts')

const {
  PUBLIC_BARE_PATHS,
  SITE_LOCALES,
  SITE_ORIGIN,
  buildLlmsTxt,
  buildPrimalCutJsonLd,
  buildRobotsTxt,
  buildSitemapXml,
  if9HubHref,
  listAllPublicSeoPaths,
  parsePublicSeoPath,
  parseSiteLocaleSegment,
  resolvePrimalCutSeoRedirect,
  siteCacheHeaders,
  siteLocalePath,
} = await loadTs('shared/site-routes.ts')

test('1. 8 语言标识符、变体归一化、未知系统语言回退 English 与单遍占位符引擎', () => {
  assert.deepEqual(LANGUAGES, ['en', 'ja', 'zh-CN', 'zh-TW', 'ko', 'de', 'fr', 'es'])
  assert.equal(LANGUAGE_LABELS['zh-TW'], '繁體中文')

  // 产品名铁律：中文名「素裁」仅在 zh-CN / zh-TW 使用，其余 6 门外语一律 PrimalCut
  assert.equal(productNameFor('zh-CN'), '素裁')
  assert.equal(productNameFor('zh-TW'), '素裁')
  for (const loc of NON_CHINESE_LOCALES) {
    assert.equal(productNameFor(loc), 'PrimalCut')
  }

  // 简繁与地区变体归一化
  assert.equal(normalizeLanguage('zh-TW'), 'zh-TW')
  assert.equal(normalizeLanguage('zh-HK'), 'zh-TW')
  assert.equal(normalizeLanguage('zh-MO'), 'zh-TW')
  assert.equal(normalizeLanguage('zh-Hant-HK'), 'zh-TW')
  assert.equal(normalizeLanguage('zh'), 'zh-CN')
  assert.equal(normalizeLanguage('zh-CN'), 'zh-CN')
  assert.equal(normalizeLanguage('zh-SG'), 'zh-CN')
  assert.equal(normalizeLanguage('zh-Hans'), 'zh-CN')
  assert.equal(normalizeLanguage('ja-JP'), 'ja')
  assert.equal(normalizeLanguage('ko-KR'), 'ko')
  assert.equal(normalizeLanguage('de-AT'), 'de')
  assert.equal(normalizeLanguage('fr-CA'), 'fr')
  assert.equal(normalizeLanguage('es-MX'), 'es')
  assert.equal(normalizeLanguagePreference('auto'), 'auto')
  assert.equal(normalizeLanguagePreference('system'), 'auto')
  assert.equal(normalizeLanguagePreference('zh'), 'zh-CN')

  // 未知系统语言（如阿拉伯语、泰语、俄语）必须回退到 English ('en')，绝不回退中文
  assert.equal(resolveSystemLanguage(['ar-SA', 'th-TH', 'ru-RU']), 'en')
  assert.equal(resolveSystemLanguage('ar-SA,th;q=0.8'), 'en')
  assert.equal(resolveLanguage('', ['ar-EG']), 'en')
  assert.equal(resolveLanguage('primalcut_lang=ja', ['ja-JP'], 'de'), 'de')

  // orderLocales 智能置顶且稳定
  assert.equal(timeZoneLocale('Asia/Tokyo'), 'ja')
  assert.equal(timeZoneLocale('Asia/Taipei'), 'zh-TW')
  assert.equal(timeZoneLocale('Europe/Berlin'), 'de')
  assert.deepEqual(orderLocales(['fr-FR', 'de']).slice(0, 3), ['fr', 'de', 'en'])

  // 单遍替换：动态值自带 {other} 绝不被二次展开
  assert.equal(
    formatMessage('Hello {name}, note {other}', { name: '{other}', other: 'WORLD' }),
    'Hello {other}, note WORLD',
  )
})

test('2. Locales/*.json 单源 8 语言键集合、*One 单复数、{placeholder} 及源码静态 t(...) 调用校验', async () => {
  const catalogs = {}
  for (const lang of LANGUAGES) {
    catalogs[lang] = JSON.parse(await readFile(path.join(root, `Locales/${lang}.json`), 'utf8'))
  }

  const zhCNFlat = flattenStrings(catalogs['zh-CN'])
  const enFlat = flattenStrings(catalogs.en)
  const baseKeys = Object.keys(zhCNFlat).sort()
  const enBaseKeys = Object.keys(enFlat).filter((k) => !k.endsWith('One')).sort()
  const pluralOneKeys = Object.keys(enFlat).filter((k) => k.endsWith('One')).sort()

  assert.deepEqual(enBaseKeys, baseKeys, 'en.json base keys must 100% match zh-CN.json')
  assert.ok(pluralOneKeys.length >= 3, 'Expected *One plural keys in en/de/fr/es')
  assert.ok(baseKeys.every((k) => !k.endsWith('One')), 'zh-CN.json must not define *One keys')

  for (const lang of LANGUAGES) {
    const flat = flattenStrings(catalogs[lang])
    const langBase = Object.keys(flat).filter((k) => !k.endsWith('One')).sort()
    const langOne = Object.keys(flat).filter((k) => k.endsWith('One')).sort()
    assert.deepEqual(langBase, baseKeys, `Locales/${lang}.json base keys mismatch`)
    if (PLURAL_ONE_LANGUAGES.has(lang)) {
      assert.deepEqual(langOne, pluralOneKeys, `Locales/${lang}.json *One keys mismatch`)
    } else {
      assert.deepEqual(langOne, [], `Locales/${lang}.json must not define *One keys`)
    }
    for (const [k, v] of Object.entries(flat)) {
      assert.ok(v.trim().length > 0, `Empty translation in Locales/${lang}.json: ${k}`)
      assert.equal(v, v.trim(), `Unexpected leading/trailing whitespace in Locales/${lang}.json: ${k}`)
      assert.deepEqual(
        extractPlaceholders(v),
        extractPlaceholders(enFlat[k]),
        `Placeholder mismatch in Locales/${lang}.json at ${k}`,
      )
    }
  }

  // 验证 *One 单复数在 en/de/fr/es 生效，在 ja/zh-CN 不拆分
  assert.equal(resolveCatalogMessage(catalogs, 'en', 'tool.queuedCount', { count: 1 }), '1 icon bundle exported')
  assert.equal(resolveCatalogMessage(catalogs, 'en', 'tool.queuedCount', { count: 3 }), '3 icon bundles exported')
  assert.equal(resolveCatalogMessage(catalogs, 'fr', 'tool.queuedCount', { count: 1 }), '1 lot d’icônes exporté')
  assert.equal(resolveCatalogMessage(catalogs, 'ja', 'tool.queuedCount', { count: 1 }), '1 件のアイコンを書き出し済み')

  // 源码中所有静态 t('...') 调用键存在性校验
  const appFiles = []
  async function walkApp(dir) {
    for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name)
      if (entry.isDirectory()) await walkApp(rel)
      else if (/\.(vue|ts|js)$/.test(entry.name)) appFiles.push(rel)
    }
  }
  await walkApp('app')

  const staticKeyRe = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g
  let verifiedKeys = 0
  for (const rel of appFiles) {
    const content = await readFile(path.join(root, rel), 'utf8')
    for (const match of content.matchAll(staticKeyRe)) {
      const key = match[1]
      verifiedKeys += 1
      assert.ok(
        lookupNestedString(catalogs['zh-CN'], key) !== undefined,
        `Missing t('${key}') in Locales/zh-CN.json (referenced in ${rel})`,
      )
      assert.ok(
        lookupNestedString(catalogs.en, key) !== undefined,
        `Missing t('${key}') in Locales/en.json (referenced in ${rel})`,
      )
    }
  }
  assert.ok(verifiedKeys >= 30, 'Expected static t(...) calls across app sources')
})

test('3. 非汉字语种零汉字残留、非中文 6 语零「素裁」及 16 个公开页面真实 SSR 渲染审计', async () => {
  for (const lang of NON_HAN_LOCALES) {
    const rawCatalog = await readFile(path.join(root, `Locales/${lang}.json`), 'utf8')
    assert.doesNotMatch(rawCatalog, CJK_HAN_RE, `CJK Han leak in Locales/${lang}.json`)
  }

  for (const lang of NON_CHINESE_LOCALES) {
    const rawCatalog = await readFile(path.join(root, `Locales/${lang}.json`), 'utf8')
    assert.doesNotMatch(rawCatalog, /素裁/, `Chinese brand name leak in Locales/${lang}.json`)
  }

  // 繁体中文必须用正体「繁體中文」，不得混入简体「繁体」
  const rawZhTW = await readFile(path.join(root, 'Locales/zh-TW.json'), 'utf8')
  assert.doesNotMatch(rawZhTW, /繁体/, 'Simplified word 繁体 found in Locales/zh-TW.json')

  // 编译并真实 SSR 渲染全部 16 条公开路径（8 语言 × `/`, `/vs-iconutil-image2icon`）
  Object.assign(globalThis, {
    useRoute: () => globalThis.__seoRoute || { path: '/', query: {} },
    useRequestURL: () => new URL('https://primal-cut.if9.cool/'),
    useAsyncData: (_k, _f, opts) => ({ data: Vue.ref(opts?.default ? opts.default() : null) }),
    useHead: (input) => {
      globalThis.__seoHeads?.push(typeof input === 'function' ? input() : input)
    },
    useSeoMeta: () => {},
  })

  const LandingMod = await compileSfcBundle('app/components/LandingView.vue')
  const CompareMod = await compileSfcBundle('app/components/ComparisonView.vue')
  const NuxtLinkStub = Vue.defineComponent({
    props: ['to'],
    setup(props, { slots }) {
      return () => Vue.h('a', { href: String(props.to || '') }, slots.default?.())
    },
  })

  for (const barePath of PUBLIC_BARE_PATHS) {
    for (const locale of SITE_LOCALES) {
      globalThis.__seoHeads = []
      globalThis.__seoRoute = { path: siteLocalePath(barePath, locale), query: {} }

      const isHome = barePath === '/'
      const Comp = isHome ? LandingMod.default : CompareMod.default

      const app = Vue.createSSRApp({
        render: () => Vue.h(Comp, { locale }),
      })
      app.component('NuxtLink', NuxtLinkStub)
      const html = await renderToString(app)

      const headEntry = globalThis.__seoHeads.find((h) => h?.link && h?.script)
      assert.ok(headEntry, `Missing useHead on ${locale} ${barePath}`)
      assert.equal(headEntry.htmlAttrs?.lang, locale)
      const canonicalHref = headEntry.link.find((l) => l.rel === 'canonical')?.href
      assert.equal(canonicalHref, `${SITE_ORIGIN}${siteLocalePath(barePath, locale)}`)
      const alternates = headEntry.link.filter((l) => l.rel === 'alternate')
      assert.equal(alternates.length, 9, `Expected 8 locales + x-default hreflang on ${locale} ${barePath}`)
      assert.equal(
        alternates.find((l) => l.hreflang === 'x-default')?.href,
        `${SITE_ORIGIN}${siteLocalePath(barePath, 'en')}`,
      )

      const ldText = headEntry.script[0]?.innerHTML || ''
      assert.ok(ldText.includes('IF9 Studio LLC'))
      assert.ok(ldText.includes('https://if9.cool/#organization'))
      assert.ok(ldText.includes('SoftwareApplication'))
      if (isHome) {
        assert.ok(ldText.includes('FAQPage'), `Home page ${locale} must include FAQPage JSON-LD`)
      } else {
        assert.ok(ldText.includes('BreadcrumbList'), `Compare page ${locale} must include BreadcrumbList JSON-LD`)
      }
      assert.doesNotMatch(ldText, /downloadUrl/i)

      // 语言选择器必须含正体「繁體中文」、零国旗 Emoji
      assert.doesNotMatch(html, FLAG_EMOJI_RE)
      assert.ok(html.includes('繁體中文'), `Traditional Endonym missing on ${locale} ${barePath}`)

      // 独立 if9 必须渲染为矢量字标 SVG（aria-label="if9"）
      assert.ok(html.includes('aria-label="if9"'), `if9 vector wordmark missing on ${locale} ${barePath}`)

      // 非中文 6 语整页与 JSON-LD 严禁出现「素裁」
      if (NON_CHINESE_LOCALES.includes(locale)) {
        assert.doesNotMatch(html, /素裁/, `Chinese brand leak in HTML on ${locale} ${barePath}`)
        assert.doesNotMatch(ldText, /素裁/, `Chinese brand leak in JSON-LD on ${locale} ${barePath}`)
      }

      // 非汉字语种整页 HTML 与 JSON-LD 剥离白名单语言自称后必须 0 汉字
      if (NON_HAN_LOCALES.includes(locale)) {
        const cleanedHtml = stripAllowedEndonyms(html)
        assert.doesNotMatch(cleanedHtml, CJK_HAN_RE, `Rendered HTML CJK leak on ${locale} ${barePath}`)
        assert.doesNotMatch(ldText, CJK_HAN_RE, `JSON-LD CJK leak on ${locale} ${barePath}`)
      }
    }
  }
})

test('4. 16 条公开路径、单跳 301 归一化、缓存洁净度与 sitemap/robots/llms 契约', () => {
  const allPaths = listAllPublicSeoPaths()
  assert.equal(allPaths.length, 16)
  assert.deepEqual(allPaths, [
    '/', '/ja', '/zh-cn', '/zh-tw', '/ko', '/de', '/fr', '/es',
    '/vs-iconutil-image2icon', '/ja/vs-iconutil-image2icon', '/zh-cn/vs-iconutil-image2icon', '/zh-tw/vs-iconutil-image2icon',
    '/ko/vs-iconutil-image2icon', '/de/vs-iconutil-image2icon', '/fr/vs-iconutil-image2icon', '/es/vs-iconutil-image2icon',
  ])

  for (const seg of ['ja', 'zh-cn', 'zh-tw', 'ko', 'de', 'fr', 'es']) {
    assert.ok(parseSiteLocaleSegment(seg))
  }
  for (const invalid of ['en', 'zh', 'zh-CN', 'zh-TW', 'ar', 'unknown']) {
    assert.equal(parseSiteLocaleSegment(invalid), null)
  }

  // 单跳 301 收敛
  assert.deepEqual(resolvePrimalCutSeoRedirect('/en', {}, 'GET'), { location: '/', statusCode: 301 })
  assert.deepEqual(resolvePrimalCutSeoRedirect('/en/vs-iconutil-image2icon', {}, 'GET'), { location: '/vs-iconutil-image2icon', statusCode: 301 })
  assert.deepEqual(resolvePrimalCutSeoRedirect('/zh', {}, 'GET'), { location: '/zh-cn', statusCode: 301 })
  assert.deepEqual(resolvePrimalCutSeoRedirect('/zh/vs-iconutil-image2icon', {}, 'GET'), { location: '/zh-cn/vs-iconutil-image2icon', statusCode: 301 })
  assert.deepEqual(resolvePrimalCutSeoRedirect('/zh-CN', {}, 'GET'), { location: '/zh-cn', statusCode: 301 })
  assert.deepEqual(resolvePrimalCutSeoRedirect('/zh-TW', {}, 'GET'), { location: '/zh-tw', statusCode: 301 })
  assert.deepEqual(resolvePrimalCutSeoRedirect('/ja/', {}, 'GET'), { location: '/ja', statusCode: 301 })
  assert.deepEqual(resolvePrimalCutSeoRedirect('/en', { lang: 'ja' }, 'GET'), { location: '/ja', statusCode: 301 })
  assert.deepEqual(
    resolvePrimalCutSeoRedirect('/vs-iconutil-image2icon', { lang: 'de', utm_source: 'if9' }, 'GET'),
    { location: '/de/vs-iconutil-image2icon?utm_source=if9', statusCode: 301 },
  )
  assert.deepEqual(resolvePrimalCutSeoRedirect('/', { lang: 'ko' }, 'GET'), { location: '/ko', statusCode: 301 })

  // 根路径 `/` 无 ?lang= 时绝不重定向；/app 与 /api 不拦截
  assert.equal(resolvePrimalCutSeoRedirect('/', {}, 'GET'), null)
  assert.equal(resolvePrimalCutSeoRedirect('/app', { lang: 'de' }, 'GET'), null)
  assert.equal(resolvePrimalCutSeoRedirect('/api/public/site-context', {}, 'GET'), null)

  // 匿名公开路径缓存头洁净：无 Vary: Cookie、无 Set-Cookie
  const cacheHdrs = siteCacheHeaders()
  assert.match(cacheHdrs['Cache-Control'], /^public,/)
  assert.equal(cacheHdrs['Vary'], undefined)

  // 法务链接同语种对齐
  assert.equal(if9HubHref('en', '/legal/privacy'), 'https://if9.cool/legal/privacy')
  assert.equal(if9HubHref('ja', '/legal/privacy'), 'https://if9.cool/ja/legal/privacy')
  assert.equal(if9HubHref('zh-CN', '/legal/terms'), 'https://if9.cool/zh-cn/legal/terms')
  assert.equal(if9HubHref('zh-TW', '/legal/refund'), 'https://if9.cool/zh-tw/legal/refund')
  assert.equal(if9HubHref('es'), 'https://if9.cool/es')

  assert.equal(parsePublicSeoPath('/ko/vs-iconutil-image2icon').locale, 'ko')
  assert.equal(parsePublicSeoPath('/app').isPublicSeo, false)

  // robots.txt / sitemap.xml / llms.txt 校验
  const robots = buildRobotsTxt()
  assert.match(robots, /Allow: \//)
  assert.match(robots, /Disallow: \/app/)
  assert.match(robots, /Sitemap: https:\/\/primal-cut\.if9\.cool\/sitemap\.xml/)

  const sitemap = buildSitemapXml()
  assert.equal((sitemap.match(/<url>/g) || []).length, 16)
  assert.equal((sitemap.match(/xhtml:link/g) || []).length, 16 * 9)

  const llms = buildLlmsTxt()
  assert.match(llms, /# PrimalCut/)
  assert.match(llms, /vs-iconutil-image2icon/)
})

test('5. 源码级正交图标规范、零硬编码 UI 中文、字重 <= 600 与排版红线审计', async () => {
  const sourceFiles = []
  async function walk(dir) {
    for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
      if (['node_modules', 'dist', '.nuxt', '.output', 'vendor'].includes(entry.name)) continue
      const rel = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(rel)
      else if (/\.(vue|ts|js)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) sourceFiles.push(rel)
    }
  }
  await walk('app')
  await walk('shared')
  await walk('server')

  // 允许出现中文常量的唯一多语言定义文件（界面与业务组件严禁硬编码中文）
  const KEPT_CJK_FILES = new Set([
    path.join('shared', 'language.ts'),
    path.join('shared', 'site-routes.ts'),
  ])

  const forbiddenIconRe = /\b(Sparkles|lucide:sparkles|Brain|lucide:brain|Bot|lucide:bot|lucide:languages|Edit2|Edit3|SquarePen|Settings2|Grid2X2|Grid3x3|AlertCircle|CheckCircle)\b/
  const forbiddenBoldRe = /\b(font-bold|font-extrabold|font-black)\b/

  for (const rel of sourceFiles) {
    const content = await readFile(path.join(root, rel), 'utf8')
    assert.doesNotMatch(content, FLAG_EMOJI_RE, `Forbidden flag emoji in ${rel}`)
    assert.doesNotMatch(content, forbiddenIconRe, `Forbidden non-canonical icon in ${rel}`)
    assert.doesNotMatch(content, forbiddenBoldRe, `Forbidden font-weight > 600 in ${rel}`)
    assert.doesNotMatch(content, /\buppercase\b/, `Forbidden global uppercase in ${rel}`)

    if (!KEPT_CJK_FILES.has(rel)) {
      const withoutComments = content
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
      assert.doesNotMatch(withoutComments, CJK_HAN_RE, `Hardcoded Chinese text found in ${rel} (must use t())`)
    }
  }

  // LocaleSelect 核心特征验证
  const localeSelectSrc = await readFile(path.join(root, 'app/components/LocaleSelect.vue'), 'utf8')
  assert.match(localeSelectSrc, /orderLocales/)
  assert.match(localeSelectSrc, /:lang="loc"/)
  assert.match(localeSelectSrc, /name="globe"/)

  // UiIcon v2 图标规范验证
  const uiIconSrc = await readFile(path.join(root, 'app/components/UiIcon.vue'), 'utf8')
  for (const iconSym of [
    'Globe',
    'Settings',
    'SlidersHorizontal',
    'Hash',
    'Pencil',
    'Trash2',
    'LayoutGrid',
    'LayoutList',
    'ArrowUpRight',
    'CircleAlert',
    'CircleCheck',
    'Loader2',
    'HardDrive',
  ]) {
    assert.match(uiIconSrc, new RegExp(`\\b${iconSym}\\b`), `Missing v2 icon ${iconSym} in UiIcon.vue`)
  }
})
