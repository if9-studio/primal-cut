// @if9/brand 无框架矢量核心镜像（与 if9-cool/packages/brand/index.mjs 及 docs/brand/v2/icons.md 几何完全一致）：
// 1. IF9_WORD / splitIf9：独立出现的 `if9` 渲染矢量字标，遇中日韩宽字符自动留出 0.18em 呼吸间距，域名与邮箱保持纯文本；
// 2. BRAND_AI：24×24 Lucide 网格（stroke-width 1.75）的 `AI✦` 专属图标。

export type BrandWordWeight = 'light' | 'regular' | 'medium' | 'bold'

export interface BrandWordGlyph {
  viewBox: string
  width: number
  height: number
  descent: number
  letters: string
  nine: string
}

export const IF9_WORD: Readonly<Record<BrandWordWeight, BrandWordGlyph>> = {
  light: {
    viewBox: '47 90 506 601.92',
    width: 0.961,
    height: 1.144,
    descent: 0.251,
    letters: 'M49 213a21 21 0 1 0 42 0a21 21 0 1 0 -42 0ZM58 280h24v280h-24ZM202 560V188A96 96 0 0 1 363.44 117.76L347.08 135.32A72 72 0 0 0 226 188V560ZM154 280h134v24h-134Z',
    nine: 'M550 444C550 543.76 501.28 631.92 394.56 689.92C429.36 643.52 452.56 601.76 459.52 557.1A116 116 0 1 1 550 444ZM348.16 437.04a81.2 81.2 0 1 0 162.4 0a81.2 81.2 0 1 0 -162.4 0Z',
  },
  regular: {
    viewBox: '43.2 82 509.8 609.92',
    width: 0.969,
    height: 1.159,
    descent: 0.251,
    letters: 'M45.2 209.2a24.8 24.8 0 1 0 49.6 0a24.8 24.8 0 1 0 -49.6 0ZM50 280h40v280h-40ZM194 560V188A104 104 0 0 1 368.89 111.9L341.62 141.17A64 64 0 0 0 234 188V560ZM154 272h134v40h-134Z',
    nine: 'M550 444C550 543.76 501.28 631.92 394.56 689.92C429.36 643.52 452.56 601.76 459.52 557.1A116 116 0 1 1 550 444ZM370 444a64 64 0 1 0 128 0a64 64 0 1 0 -128 0Z',
  },
  medium: {
    viewBox: '37 77 516 614.92',
    width: 0.98,
    height: 1.168,
    descent: 0.251,
    letters: 'M39 203a31 31 0 1 0 62 0a31 31 0 1 0 -62 0ZM45 280h50v280h-50ZM189 560V188A109 109 0 0 1 372.3 108.25L338.22 144.83A59 59 0 0 0 239 188V560ZM154 267h134v50h-134Z',
    nine: 'M550 444C550 543.76 501.28 631.92 394.56 689.92C429.36 643.52 452.56 601.76 459.52 557.1A116 116 0 1 1 550 444ZM370 444a64 64 0 1 0 128 0a64 64 0 1 0 -128 0Z',
  },
  bold: {
    viewBox: '29.56 71 523.44 620.92',
    width: 0.995,
    height: 1.18,
    descent: 0.251,
    letters: 'M31.560000000000002 195.56a38.44 38.44 0 1 0 76.88 0a38.44 38.44 0 1 0 -76.88 0ZM39 280h62v280h-62ZM183 560V188A115 115 0 0 1 376.39 103.86L334.13 149.22A53 53 0 0 0 245 188V560ZM154 261h134v62h-134Z',
    nine: 'M550 444C550 543.76 501.28 631.92 394.56 689.92C429.36 643.52 452.56 601.76 459.52 557.1A116 116 0 1 1 550 444ZM370 444a64 64 0 1 0 128 0a64 64 0 1 0 -128 0Z',
  },
}

export const BRAND_AI = {
  viewBox: '0 0 24 24',
  strokeWidth: 1.75,
  letters: 'M2 20L5.6 9.6 9.2 20M3.15 16.9h4.9M12.2 9.6V20',
  spark: 'M17.6 2.2l1 2.95a1 1 0 0 0 .65.65L22 6.8l-2.75 1a1 1 0 0 0-.65.65L17.6 11.4l-1-2.95a1 1 0 0 0-.65-.65L13.2 6.8l2.75-1a1 1 0 0 0 .65-.65z',
} as const

export const NINE_FILL = 'var(--if9-accent, currentColor)'

const WIDE = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/
const NAME = 'if9'

function standsAlone(text: string, at: number): boolean {
  const before = text[at - 1] ?? ''
  const after = text[at + NAME.length] ?? ''
  const next = text[at + NAME.length + 1] ?? ''
  return !/[\w@./-]/.test(before) && !/\w/.test(after) && !(after === '.' && /\w/.test(next))
}

export type BrandTextPart =
  | { brand: false; text: string }
  | { brand: true; gapBefore: boolean; gapAfter: boolean }

export function splitIf9(text: string): BrandTextPart[] {
  const parts: BrandTextPart[] = []
  let cursor = 0
  for (let at = text.indexOf(NAME); at !== -1; at = text.indexOf(NAME, at + NAME.length)) {
    if (!standsAlone(text, at)) continue
    const head = text.slice(cursor, at)
    const tail = text.slice(at + NAME.length)
    const gapBefore = WIDE.test(head.trimEnd().slice(-1))
    const gapAfter = WIDE.test(tail.trimStart().charAt(0))
    const kept = gapBefore ? head.trimEnd() : head
    if (kept) parts.push({ brand: false, text: kept })
    parts.push({ brand: true, gapBefore, gapAfter })
    cursor = at + NAME.length + (gapAfter ? tail.length - tail.trimStart().length : 0)
  }
  if (cursor < text.length) parts.push({ brand: false, text: text.slice(cursor) })
  return parts
}

export function wordBox(
  weight: BrandWordWeight = 'medium',
  { gapBefore = false, gapAfter = false } = {},
): Record<string, string> {
  const mark = IF9_WORD[weight] ?? IF9_WORD.medium
  const box: Record<string, string> = {
    display: 'inline-block',
    overflow: 'visible',
    width: `${mark.width}em`,
    height: `${mark.height}em`,
    verticalAlign: `${-mark.descent}em`,
  }
  if (gapBefore) box.marginLeft = '.18em'
  if (gapAfter) box.marginRight = '.18em'
  return box
}
