<!-- SortIcon.vue -->
<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  field: String,       // e.g., "level" or "time"
  sortField: String,   // which field is currently sorted
  sortDir: String,     // 'asc' or 'desc'
})
</script>

<template>
  <span class="inline-block ml-1">
    <!-- If the field is currently sorted, show up/down arrow -->
    <template v-if="props.sortField === props.field">
      <template v-if="props.sortDir === 'asc'">
        <!-- Up arrow -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 inline-block"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 15l7-7 7 7"
          />
        </svg>
      </template>
      <template v-else>
        <!-- Down arrow -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-4 h-4 inline-block"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </template>
    </template>
  </span>
</template>

<style scoped>
/* Optional local styles */
</style>
