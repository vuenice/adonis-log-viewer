<!-- LogCounters.vue -->
<script setup>
import { defineProps } from 'vue'
import Badges from './Badges.vue'

const props = defineProps({
  debugCount: {
    type: Number,
    default: 0,
  },
  infoCount: {
    type: Number,
    default: 0,
  },
  warningCount: {
    type: Number,
    default: 0,
  },
  errorCount: {
    type: Number,
    default: 0,
  },
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 m-2">
    <!-- Debug Badge -->
    <Badges
      label="Debug"
      :count="props.debugCount"
      badgeColor="bg-cyan-600"
      iconColor="text-cyan-600"
    />

    <!-- Info Badge -->
    <Badges
      label="Info"
      :count="props.infoCount"
      badgeColor="bg-cyan-600"
      iconColor="text-cyan-600"
    />

    <!-- Warning Badge -->
    <Badges
      label="Warning"
      :count="props.warningCount"
      badgeColor="bg-yellow-600"
      iconColor="text-yellow-600"
    />

    <!-- Error Badge -->
    <Badges
      label="Error"
      :count="props.errorCount"
      badgeColor="bg-red-500"
      iconColor="text-red-500"
    />
  </div>
</template>

<style scoped>
/* Additional styling if needed */
</style>
