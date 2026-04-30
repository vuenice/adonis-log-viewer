<!-- Badges.vue -->
<script setup>
import { defineProps } from 'vue'
import { CheckIcon } from '@heroicons/vue/24/solid'

// Define props for the badge
// e.g., "label" = "Debug", "count" = 2595, "badgeColor" = "bg-cyan-600", "iconColor" = "text-cyan-600"
const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  count: {
    type: Number,
    default: 0,
  },
  badgeColor: {
    type: String,
    default: 'bg-gray-600', // fallback color
  },
  iconColor: {
    type: String,
    default: 'text-gray-600', // fallback icon color
  },
})
</script>

<template>
  <div class="inline-flex items-center px-3 py-1 text-xs font-base text-white rounded-sm"
       :class="badgeColor">
    <!-- White box around the check icon -->
    <div class="flex items-center justify-center w-3 h-3 mr-1 rounded-xs bg-white">
      <CheckIcon class="w-2.5 h-2.5" :class="iconColor" />
    </div>
    {{ label }}: {{ count }}
  </div>
</template>

<style scoped>
/* Additional styling if needed */
</style>
