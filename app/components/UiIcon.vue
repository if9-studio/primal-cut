<script setup lang="ts">
import type { Component } from 'vue'
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Download,
  FileImage,
  Globe,
  HardDrive,
  Hash,
  LayoutGrid,
  LayoutList,
  Loader2,
  Pencil,
  Settings,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-vue-next'

// 跨应用正交图标治理（对齐 docs/brand/v2/icons.md）：
// 语言切换 Globe、标签 Hash、编辑 Pencil、删除 Trash2、设置 Settings、
// 筛选调节 SlidersHorizontal、网格/列表 LayoutGrid/LayoutList、外链 ArrowUpRight、
// 本地存储 HardDrive、状态 CircleAlert/CircleCheck、加载 Loader2。
export type UiIconName =
  | 'globe'
  | 'settings'
  | 'sliders'
  | 'hash'
  | 'pencil'
  | 'trash'
  | 'grid'
  | 'list'
  | 'external'
  | 'hard-drive'
  | 'loader'
  | 'alert'
  | 'check-circle'
  | 'upload'
  | 'image'
  | 'download'
  | 'x'
  | 'check'
  | 'chevron-down'

const props = withDefaults(
  defineProps<{
    name: UiIconName
    size?: number
    strokeWidth?: number
  }>(),
  { size: 15, strokeWidth: 1.75 },
)

const ICONS: Record<UiIconName, Component> = {
  'globe': Globe,
  'settings': Settings,
  'sliders': SlidersHorizontal,
  'hash': Hash,
  'pencil': Pencil,
  'trash': Trash2,
  'grid': LayoutGrid,
  'list': LayoutList,
  'external': ArrowUpRight,
  'hard-drive': HardDrive,
  'loader': Loader2,
  'alert': CircleAlert,
  'check-circle': CircleCheck,
  'upload': UploadCloud,
  'image': FileImage,
  'download': Download,
  'x': X,
  'check': Check,
  'chevron-down': ChevronDown,
}
</script>

<template>
  <component
    :is="ICONS[props.name]"
    :size="props.size"
    :stroke-width="props.strokeWidth"
    aria-hidden="true"
  />
</template>
