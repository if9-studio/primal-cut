<script setup lang="ts">
import { createError } from 'h3'
import LandingView from '~/components/LandingView.vue'
import { parseSiteLocaleSegment } from '~~/shared/site-routes'

const route = useRoute()
const locale = parseSiteLocaleSegment(route.params.locale)
if (!locale) {
  throw createError({ statusCode: 404, statusMessage: 'Page Not Found', fatal: true })
}
</script>

<template>
  <LandingView :locale="locale" />
</template>
