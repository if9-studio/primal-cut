<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
import type { Language } from '~~/shared/language'
import UiIcon from './UiIcon.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    locale?: Language
    allowLanguageSetting?: boolean
    roundedCorners: boolean
    safePadding: boolean
    pngPreset: 'extension' | 'macos'
  }>(),
  {
    locale: undefined,
    allowLanguageSetting: false,
  },
)

const emit = defineEmits<{
  close: []
  'update:roundedCorners': [value: boolean]
  'update:safePadding': [value: boolean]
  'update:pngPreset': [value: 'extension' | 'macos']
}>()

const { t, languagePreference, setLanguage, availableLanguages } = useI18n(() => props.locale)

const handleLanguageChange = (e: Event) => {
  const val = (e.target as HTMLSelectElement).value
  setLanguage(val)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-xs"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-slate-900">{{ t('settings.title') }}</h2>
            <p class="mt-1 text-xs text-slate-500">{{ t('settings.subtitle') }}</p>
          </div>
          <button
            type="button"
            class="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            :aria-label="t('settings.close')"
            @click="emit('close')"
          >
            <UiIcon name="x" :size="16" />
          </button>
        </div>

        <div class="mt-5 space-y-5">
          <!-- Language preference (in workbench / tool settings) -->
          <div v-if="props.allowLanguageSetting" class="space-y-2">
            <label for="primalcut-settings-lang" class="block text-xs font-medium text-slate-700">
              {{ t('settings.languageLabel') }}
            </label>
            <div class="relative">
              <UiIcon name="globe" :size="14" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
              <select
                id="primalcut-settings-lang"
                :value="languagePreference"
                class="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pr-8 pl-9 text-sm text-slate-800 outline-none transition-colors focus:border-slate-500"
                @change="handleLanguageChange"
              >
                <option
                  v-for="opt in availableLanguages"
                  :key="opt.code"
                  :value="opt.code"
                  :lang="opt.lang"
                >
                  {{ opt.name }}
                </option>
              </select>
              <UiIcon name="chevron-down" :size="14" class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400" />
            </div>
            <p class="text-xs leading-5 text-slate-500">{{ t('settings.languageHint') }}</p>
          </div>

          <!-- Default crop parameters -->
          <div class="space-y-3">
            <p class="text-xs font-medium text-slate-700">{{ t('settings.defaultsTitle') }}</p>

            <label class="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div>
                <div class="text-sm font-medium text-slate-800">{{ t('tool.roundedCorners') }}</div>
                <div class="text-xs text-slate-500">{{ t('tool.roundedCornersHint') }}</div>
              </div>
              <input
                type="checkbox"
                :checked="props.roundedCorners"
                class="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900"
                @change="emit('update:roundedCorners', ($event.target as HTMLInputElement).checked)"
              />
            </label>

            <label class="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div>
                <div class="text-sm font-medium text-slate-800">{{ t('tool.safePadding') }}</div>
                <div class="text-xs text-slate-500">{{ t('tool.safePaddingHint') }}</div>
              </div>
              <input
                type="checkbox"
                :checked="props.safePadding"
                class="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900"
                @change="emit('update:safePadding', ($event.target as HTMLInputElement).checked)"
              />
            </label>

            <div class="space-y-1.5">
              <p class="text-xs text-slate-600">{{ t('tool.pngPresetLabel') }}</p>
              <div class="grid gap-2">
                <button
                  type="button"
                  class="rounded-xl border px-3 py-2 text-left text-xs transition-colors"
                  :class="props.pngPreset === 'extension' ? 'border-sky-300 bg-sky-50/60 font-medium text-sky-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'"
                  @click="emit('update:pngPreset', 'extension')"
                >
                  {{ t('tool.presetExtension') }}
                </button>
                <button
                  type="button"
                  class="rounded-xl border px-3 py-2 text-left text-xs transition-colors"
                  :class="props.pngPreset === 'macos' ? 'border-sky-300 bg-sky-50/60 font-medium text-sky-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'"
                  @click="emit('update:pngPreset', 'macos')"
                >
                  {{ t('tool.presetMacApp') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            type="button"
            class="rounded-full bg-slate-900 px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
            @click="emit('close')"
          >
            {{ t('settings.close') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
