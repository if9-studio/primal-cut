<script setup lang="ts">
import { computed } from 'vue'
import { IF9_WORD, NINE_FILL, splitIf9, wordBox, type BrandWordWeight } from '~~/shared/brand'

const props = withDefaults(
  defineProps<{
    text: string
    weight?: BrandWordWeight
  }>(),
  {
    weight: 'medium',
  },
)

const mark = computed(() => IF9_WORD[props.weight] ?? IF9_WORD.medium)
const parts = computed(() => splitIf9(props.text || ''))
</script>

<template>
  <template v-for="(part, idx) in parts" :key="idx">
    <svg
      v-if="part.brand"
      :viewBox="mark.viewBox"
      :style="wordBox(props.weight, { gapBefore: part.gapBefore, gapAfter: part.gapAfter })"
      role="img"
      aria-label="if9"
    >
      <path fill="currentColor" :d="mark.letters" />
      <path :style="{ fill: NINE_FILL }" :d="mark.nine" />
    </svg>
    <template v-else>{{ part.text }}</template>
  </template>
</template>
