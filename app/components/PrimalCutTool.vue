<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import JSZip from 'jszip'
import { Buffer } from 'buffer'
// @ts-ignore
import UZIP from 'png2icons/lib/UZIP'
import { downloadBlob } from '~~/utils/file'
import { useI18n } from '~/composables/useI18n'
import type { Language } from '~~/shared/language'
import UiIcon from './UiIcon.vue'
import SettingsModal from './SettingsModal.vue'

interface ExportRecord {
  id: string
  filename: string
  format: 'icns' | 'png-set'
  bytes: number
  timestamp: string
}

const props = withDefaults(
  defineProps<{
    locale?: Language
    allowLanguageSetting?: boolean
  }>(),
  {
    locale: undefined,
    allowLanguageSetting: false,
  },
)

const MAX_FILE_BYTES = 10 * 1024 * 1024
const EXTENSION_SIZES = [16, 48, 128] as const
const MACOS_APPICON_SIZES = [16, 32, 64, 128, 256, 512, 1024] as const

const { t, currentLang } = useI18n(() => props.locale)

const file = ref<File | null>(null)
const fileDimensions = ref<{ width: number; height: number } | null>(null)
const customBaseName = ref('')
const editingName = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const conversionType = ref<'icns' | 'png-set'>('icns')
const showOptions = ref(false)
const useRoundedCorners = ref(true)
const useSafePadding = ref(true)
const pngPreset = ref<'extension' | 'macos'>('extension')
const specViewMode = ref<'grid' | 'list'>('grid')
const showSettings = ref(false)

const isDragging = ref(false)
const isConverting = ref(false)
const error = ref<string | null>(null)
const exportsHistory = ref<ExportRecord[]>([])

const activeLocale = computed(() => props.locale ?? currentLang.value)

const formatNumber = (val: number, digits = 1) => {
  try {
    return new Intl.NumberFormat(activeLocale.value, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(val)
  } catch {
    return val.toFixed(digits)
  }
}

const activePngSizes = computed<readonly number[]>(() =>
  pngPreset.value === 'macos' ? MACOS_APPICON_SIZES : EXTENSION_SIZES,
)

const activePngFileCount = computed(() =>
  pngPreset.value === 'macos' ? MACOS_APPICON_SIZES.length : EXTENSION_SIZES.length + 1,
)

const targetSpecTags = computed<string[]>(() => {
  if (conversionType.value === 'icns') {
    const tags = ['ICNS', useSafePadding.value ? '1264 × 1264 px' : '1024 × 1024 px']
    if (useRoundedCorners.value) tags.push('22.37%')
    tags.push('Bicubic')
    return tags
  }
  const sizeTags = activePngSizes.value.map((s) => `${s} × ${s} px`)
  return pngPreset.value === 'extension' ? ['icon.png', ...sizeTags] : sizeTags
})

const inspectImageDimensions = (selected: File) => {
  const objectUrl = URL.createObjectURL(selected)
  const img = new Image()
  img.onload = () => {
    fileDimensions.value = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height }
    URL.revokeObjectURL(objectUrl)
  }
  img.onerror = () => {
    fileDimensions.value = null
    URL.revokeObjectURL(objectUrl)
  }
  img.src = objectUrl
}

const acceptPngFile = (candidate: File | undefined | null) => {
  if (!candidate) return
  const isPng = candidate.type === 'image/png' || candidate.name.toLowerCase().endsWith('.png')
  if (!isPng) {
    error.value = t('tool.errorNotPng')
    return
  }
  if (candidate.size > MAX_FILE_BYTES) {
    error.value = t('tool.errorTooLarge', { maxMb: 10 })
    return
  }
  file.value = candidate
  customBaseName.value = candidate.name.replace(/\.[^/.]+$/, '') || 'icon'
  editingName.value = false
  error.value = null
  inspectImageDimensions(candidate)
}

const clearCurrentFile = () => {
  file.value = null
  fileDimensions.value = null
  customBaseName.value = ''
  editingName.value = false
  error.value = null
  if (fileInput.value) fileInput.value.value = ''
}

const handleDrop = (e: DragEvent) => {
  isDragging.value = false
  acceptPngFile(e.dataTransfer?.files[0])
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  acceptPngFile(target.files?.[0])
}

const loadImageElement = (sourceFile: File): Promise<{ img: HTMLImageElement; objectUrl: string }> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(sourceFile)
    const img = new Image()
    img.onload = () => resolve({ img, objectUrl })
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl)
      reject(err)
    }
    img.src = objectUrl
  })
}

const processImageForIcns = async (
  sourceFile: File,
  withRoundedCorners: boolean,
  withSafePadding: boolean,
): Promise<Buffer> => {
  const { img, objectUrl } = await loadImageElement(sourceFile)
  try {
    const canvasSize = withSafePadding ? 1264 : 1024
    const innerSize = 1024
    const pad = withSafePadding ? 120 : 0

    const canvas = document.createElement('canvas')
    canvas.width = canvasSize
    canvas.height = canvasSize
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas context not available')
    }

    const scale = Math.min(innerSize / img.width, innerSize / img.height)
    const w = img.width * scale
    const h = img.height * scale
    const x = pad + (innerSize - w) / 2
    const y = pad + (innerSize - h) / 2

    ctx.drawImage(img, x, y, w, h)

    if (withRoundedCorners) {
      ctx.globalCompositeOperation = 'destination-in'
      ctx.beginPath()
      const r = Math.min(w, h) * 0.2237
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)
      ctx.closePath()
      ctx.fillStyle = '#000000'
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((out) => {
        if (out) resolve(out)
        else reject(new Error('Canvas to Blob failed'))
      }, 'image/png')
    })
    const arrayBuffer = await blob.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const processImageResize = async (
  sourceFile: File,
  size: number,
  withRoundedCorners: boolean,
): Promise<Blob> => {
  const { img, objectUrl } = await loadImageElement(sourceFile)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas context not available')
    }

    const scale = Math.min(size / img.width, size / img.height)
    const w = img.width * scale
    const h = img.height * scale
    const x = (size - w) / 2
    const y = (size - h) / 2

    ctx.drawImage(img, x, y, w, h)

    if (withRoundedCorners) {
      ctx.globalCompositeOperation = 'destination-in'
      ctx.beginPath()
      const r = Math.min(w, h) * 0.2237
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + h, r)
      ctx.arcTo(x + w, y + h, x, y + h, r)
      ctx.arcTo(x, y + h, x, y, r)
      ctx.arcTo(x, y, x + w, y, r)
      ctx.closePath()
      ctx.fillStyle = '#000000'
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((out) => {
        if (out) resolve(out)
        else reject(new Error('Resize failed'))
      }, 'image/png')
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const pushExportHistory = (filename: string, format: 'icns' | 'png-set', bytes: number) => {
  let timeStr = ''
  try {
    timeStr = new Intl.DateTimeFormat(activeLocale.value, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date())
  } catch {
    timeStr = new Date().toTimeString().slice(0, 8)
  }
  exportsHistory.value.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    filename,
    format,
    bytes,
    timestamp: timeStr,
  })
  if (exportsHistory.value.length > 6) {
    exportsHistory.value.length = 6
  }
}

const convert = async () => {
  if (!file.value) return

  isConverting.value = true
  error.value = null

  try {
    const rawName = customBaseName.value.trim() || file.value.name.replace(/\.[^/.]+$/, '') || 'icon'
    const safeFilename = rawName.replace(/[\\/:*?"<>|]/g, '-')

    if (conversionType.value === 'icns') {
      const processedBuffer = await processImageForIcns(
        file.value,
        useRoundedCorners.value,
        useSafePadding.value,
      )

      if (typeof window !== 'undefined') {
        ;(window as unknown as Record<string, unknown>).UZIP = UZIP
        ;(window as unknown as Record<string, unknown>).Buffer = Buffer
        ;(window as unknown as Record<string, unknown>).global = window
      }
      const png2icons = await import('png2icons')
      const icnsBuffer = png2icons.createICNS(processedBuffer, png2icons.BICUBIC, 0)

      if (!icnsBuffer) {
        throw new Error(t('tool.errorIcnsFailed'))
      }

      const blob = new Blob([icnsBuffer as unknown as BlobPart], { type: 'application/x-icns' })
      const outputName = `${safeFilename}.icns`
      downloadBlob(blob, outputName)
      pushExportHistory(outputName, 'icns', blob.size)
    } else {
      const zip = new JSZip()
      const sizes = activePngSizes.value

      if (pngPreset.value === 'extension') {
        zip.file('icon.png', file.value)
        for (const size of sizes) {
          const resizedBlob = await processImageResize(file.value, size, useRoundedCorners.value)
          zip.file(`icon${size}.png`, resizedBlob)
        }
      } else {
        for (const size of sizes) {
          const resizedBlob = await processImageResize(file.value, size, useRoundedCorners.value)
          zip.file(`icon_${size}x${size}.png`, resizedBlob)
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const outputName = `${safeFilename}-icons.zip`
      downloadBlob(zipBlob, outputName)
      pushExportHistory(outputName, 'png-set', zipBlob.size)
    }
  } catch (e: unknown) {
    console.error(e)
    error.value = e instanceof Error && e.message ? e.message : t('tool.errorConvertFailed')
  } finally {
    isConverting.value = false
  }
}

watch(activeLocale, () => {
  error.value = null
})
</script>

<template>
  <div class="w-full">
    <div class="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/85 shadow-[0_8px_40px_rgb(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300">
      <div class="space-y-6 p-6 sm:p-8">
        <!-- Toolbar Header -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            <UiIcon name="hard-drive" :size="14" class="text-sky-600" />
            <span>{{ t('landing.privacyBadge') }}</span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              :class="{ 'border-sky-300 bg-sky-50/60 text-sky-900': showOptions }"
              @click="showOptions = !showOptions"
            >
              <UiIcon name="sliders" :size="14" />
              <span>{{ t('tool.optionsToggle') }}</span>
            </button>

            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              :aria-label="t('nav.settings')"
              @click="showSettings = true"
            >
              <UiIcon name="settings" :size="14" />
              <span>{{ t('nav.settings') }}</span>
            </button>
          </div>
        </div>

        <!-- Drop Zone -->
        <div
          class="group relative cursor-pointer overflow-hidden rounded-2xl border border-dashed p-8 text-center transition-all duration-300 sm:p-10"
          :class="[
            isDragging
              ? 'scale-[1.01] border-sky-400 bg-sky-50/40'
              : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50/60',
          ]"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="fileInput?.click()"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/png"
            class="hidden"
            @change="handleFileSelect"
          />

          <!-- Empty State -->
          <div v-if="!file" class="flex flex-col items-center space-y-4 transition-transform duration-300 group-hover:-translate-y-0.5">
            <div class="rounded-2xl border border-slate-100 bg-white p-4 text-slate-400 shadow-sm transition-all duration-300 group-hover:border-sky-100 group-hover:text-sky-600 group-hover:shadow-md">
              <UiIcon name="upload" :size="32" :stroke-width="1.5" />
            </div>
            <div class="space-y-1.5">
              <p class="text-base font-medium text-slate-700 sm:text-lg">{{ t('tool.dropTitle') }}</p>
              <p class="text-xs text-slate-500 sm:text-sm">{{ t('tool.dropSubtitle', { maxMb: 10 }) }}</p>
            </div>
          </div>

          <!-- File Selected State -->
          <div v-else class="flex flex-col items-center space-y-4">
            <div class="relative">
              <div class="rounded-2xl border border-emerald-100 bg-white p-4 text-emerald-600 shadow-sm">
                <UiIcon name="image" :size="32" :stroke-width="1.5" />
              </div>
              <button
                type="button"
                :aria-label="t('tool.clearFile')"
                :title="t('tool.clearFile')"
                class="absolute -top-2 -right-2 rounded-full border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm transition-colors hover:border-rose-200 hover:text-rose-600"
                @click.stop="clearCurrentFile"
              >
                <UiIcon name="trash" :size="13" />
              </button>
            </div>

            <div class="space-y-1">
              <p class="max-w-xs truncate text-base font-medium text-slate-800 sm:max-w-sm sm:text-lg">{{ file.name }}</p>
              <p v-if="fileDimensions" class="text-xs text-slate-500 tabular-nums sm:text-sm">
                {{ t('tool.fileMeta', { width: fileDimensions.width, height: fileDimensions.height, kb: formatNumber(file.size / 1024, 1) }) }}
              </p>
              <p v-else class="text-xs text-slate-500 tabular-nums sm:text-sm">
                {{ formatNumber(file.size / 1024, 1) }} {{ t('common.kbUnit') }}
              </p>
              <p class="text-xs text-emerald-700 tabular-nums">
                {{ t('tool.selectedFileCount', { count: 1 }) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Output Filename Rename Bar (visible when file loaded) -->
        <div v-if="file" class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <label for="primalcut-output-name" class="text-xs font-medium text-slate-600">
              {{ t('tool.renameLabel') }}
            </label>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
              :aria-label="t('tool.editNameAria')"
              @click="editingName = !editingName"
            >
              <UiIcon name="pencil" :size="13" />
              <span class="font-mono text-xs text-slate-700">{{ customBaseName || 'icon' }}</span>
            </button>
          </div>
          <div v-if="editingName" class="mt-2.5">
            <input
              id="primalcut-output-name"
              v-model="customBaseName"
              type="text"
              :placeholder="t('tool.renamePlaceholder')"
              class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-sky-400"
            />
          </div>
        </div>

        <!-- Crop & Export Options Panel -->
        <div v-if="showOptions" class="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 sm:p-5">
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-slate-300">
              <div class="min-w-0 space-y-0.5">
                <div class="text-sm font-medium text-slate-800">{{ t('tool.roundedCorners') }}</div>
                <div class="text-xs text-slate-500">{{ t('tool.roundedCornersHint') }}</div>
              </div>
              <input v-model="useRoundedCorners" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900" />
            </label>

            <label
              class="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-slate-300"
              :class="{ 'opacity-60': conversionType !== 'icns' }"
            >
              <div class="min-w-0 space-y-0.5">
                <div class="text-sm font-medium text-slate-800">{{ t('tool.safePadding') }}</div>
                <div class="text-xs text-slate-500">{{ t('tool.safePaddingHint') }}</div>
              </div>
              <input v-model="useSafePadding" type="checkbox" :disabled="conversionType !== 'icns'" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900" />
            </label>
          </div>

          <div v-if="conversionType === 'png-set'" class="space-y-2">
            <p class="text-xs font-medium text-slate-600">{{ t('tool.pngPresetLabel') }}</p>
            <div class="grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                class="rounded-xl border px-3.5 py-2.5 text-left text-xs transition-colors"
                :class="pngPreset === 'extension' ? 'border-sky-300 bg-sky-50/60 font-medium text-sky-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'"
                @click="pngPreset = 'extension'"
              >
                {{ t('tool.presetExtension') }}
              </button>
              <button
                type="button"
                class="rounded-xl border px-3.5 py-2.5 text-left text-xs transition-colors"
                :class="pngPreset === 'macos' ? 'border-sky-300 bg-sky-50/60 font-medium text-sky-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'"
                @click="pngPreset = 'macos'"
              >
                {{ t('tool.presetMacApp') }}
              </button>
            </div>
            <p class="text-xs text-slate-500 tabular-nums">{{ t('tool.pngSizeCount', { count: activePngFileCount }) }}</p>
          </div>
        </div>

        <!-- Format Selection -->
        <div class="space-y-3">
          <label class="block text-xs font-medium text-slate-500">{{ t('tool.formatLabel') }}</label>
          <div class="grid gap-3.5 sm:grid-cols-2">
            <button
              type="button"
              class="group relative min-w-0 rounded-2xl border p-4 text-left transition-all duration-200 sm:p-5"
              :class="[
                conversionType === 'icns'
                  ? 'border-sky-300 bg-sky-50/40 text-sky-950 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-slate-50/70',
              ]"
              @click="conversionType = 'icns'"
            >
              <div class="pr-4 text-base font-medium sm:text-lg">{{ t('tool.formatIcnsTitle') }}</div>
              <div class="mt-1 text-xs opacity-75">{{ t('tool.formatIcnsDesc') }}</div>
              <div v-if="conversionType === 'icns'" class="absolute top-4 right-4 h-2 w-2 rounded-full bg-sky-500"></div>
            </button>

            <button
              type="button"
              class="group relative min-w-0 rounded-2xl border p-4 text-left transition-all duration-200 sm:p-5"
              :class="[
                conversionType === 'png-set'
                  ? 'border-sky-300 bg-sky-50/40 text-sky-950 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-slate-50/70',
              ]"
              @click="conversionType = 'png-set'"
            >
              <div class="pr-4 text-base font-medium sm:text-lg">{{ t('tool.formatPngTitle') }}</div>
              <div class="mt-1 text-xs opacity-75">{{ t('tool.formatPngDesc') }}</div>
              <div v-if="conversionType === 'png-set'" class="absolute top-4 right-4 h-2 w-2 rounded-full bg-sky-500"></div>
            </button>
          </div>
        </div>

        <!-- Output Specs Tags + Grid/List View Toggle -->
        <div class="space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-medium text-slate-500">{{ t('tool.specTagsTitle') }}</span>
            <div class="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                :aria-label="t('tool.viewGrid')"
                :title="t('tool.viewGrid')"
                class="rounded-md p-1 transition-colors"
                :class="specViewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'"
                @click="specViewMode = 'grid'"
              >
                <UiIcon name="grid" :size="13" />
              </button>
              <button
                type="button"
                :aria-label="t('tool.viewList')"
                :title="t('tool.viewList')"
                class="rounded-md p-1 transition-colors"
                :class="specViewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'"
                @click="specViewMode = 'list'"
              >
                <UiIcon name="list" :size="13" />
              </button>
            </div>
          </div>

          <div
            :class="specViewMode === 'grid' ? 'flex flex-wrap gap-2' : 'space-y-1.5'"
          >
            <div
              v-for="tag in targetSpecTags"
              :key="tag"
              class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-600 tabular-nums"
              :class="specViewMode === 'list' ? 'flex w-full justify-between' : ''"
            >
              <span class="inline-flex items-center gap-1">
                <UiIcon name="hash" :size="12" class="text-slate-400" />
                <span>{{ tag }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-sm text-rose-700">
          <UiIcon name="alert" :size="18" class="shrink-0" />
          <span>{{ error }}</span>
        </div>

        <!-- Action Button -->
        <button
          type="button"
          :disabled="!file || isConverting"
          class="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-base font-medium text-white shadow-lg shadow-slate-200/60 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:text-lg"
          @click="convert"
        >
          <UiIcon v-if="isConverting" name="loader" :size="20" class="animate-spin text-slate-300" />
          <UiIcon v-else name="download" :size="20" class="text-slate-300 transition-colors group-hover:text-white" />
          <span>{{ isConverting ? t('tool.convertingButton') : t('tool.convertButton') }}</span>
        </button>

        <!-- Session Export History -->
        <div v-if="exportsHistory.length > 0" class="space-y-2.5 border-t border-slate-100 pt-4">
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span class="font-medium text-slate-600">
              {{ t('tool.recentTitle') }} · <span class="tabular-nums text-slate-500">{{ t('tool.queuedCount', { count: exportsHistory.length }) }}</span>
            </span>
            <button
              type="button"
              class="inline-flex items-center gap-1 text-slate-400 transition-colors hover:text-rose-600"
              @click="exportsHistory = []"
            >
              <UiIcon name="trash" :size="12" />
              <span>{{ t('tool.clearHistory') }}</span>
            </button>
          </div>
          <ul class="space-y-1.5">
            <li
              v-for="item in exportsHistory"
              :key="item.id"
              class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-slate-600"
            >
              <span class="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <UiIcon name="check-circle" :size="14" class="text-emerald-600" />
                <span>{{ item.filename }}</span>
              </span>
              <span class="font-mono text-[11px] text-slate-400 tabular-nums">
                {{ formatNumber(item.bytes / 1024, 1) }} {{ t('common.kbUnit') }} · {{ item.timestamp }}
              </span>
            </li>
          </ul>
        </div>

        <p class="text-center text-xs text-slate-400">
          {{ t('tool.localPrivacyNote') }}
        </p>
      </div>
    </div>

    <SettingsModal
      :open="showSettings"
      :locale="props.locale"
      :allow-language-setting="props.allowLanguageSetting"
      :rounded-corners="useRoundedCorners"
      :safe-padding="useSafePadding"
      :png-preset="pngPreset"
      @close="showSettings = false"
      @update:rounded-corners="useRoundedCorners = $event"
      @update:safe-padding="useSafePadding = $event"
      @update:png-preset="pngPreset = $event"
    />
  </div>
</template>
