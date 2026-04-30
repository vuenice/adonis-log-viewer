<!-- LogTable.vue -->
<script setup>
import { defineProps, defineEmits } from 'vue'
import SortIcon from './SortIcon.vue'
import {
  ExclamationTriangleIcon,   // Good for warnings
  InformationCircleIcon,     // Good for info
  ExclamationCircleIcon,     // Good for errors
  WrenchScrewdriverIcon,     // Example for debug
} from '@heroicons/vue/24/solid'

/* Define Props */
const props = defineProps({
  logs: {
    type: Array,
    default: () => [],
  },
  sortField: {
    type: String,
    default: '',
  },
  sortDir: {
    type: String, // 'asc', 'desc', or null
    default: null,
  },
})

/* Define Emits */
const emit = defineEmits(['sort-by', 'time-sort-changed', 'page-size-changed'])

/* Icon mapping for each log level */
const levelIcons = {
  Debug: WrenchScrewdriverIcon,
  Info: InformationCircleIcon,
  Warning: ExclamationTriangleIcon,
  Error: ExclamationCircleIcon,
}

/* Methods (as local functions) */
function iconForLevel(level) {
  return levelIcons[level] || InformationCircleIcon // default fallback
}

// Return color-coded classes for the icon
function iconColorClass(level) {
  switch (level) {
    case 'Debug':
      return 'text-cyan-500'
    case 'Info':
      return 'text-cyan-500'
    case 'Warning':
      return 'text-yellow-600'
    case 'Error':
      return 'text-red-500'
    default:
      return 'text-gray-500'
  }
}

// Return color-coded badge classes for the log level text background
function badgeClass(level) {
  switch (level) {
    case 'Debug':
      return 'text-cyan-600 dark:bg-cyan-600 dark:text-cyan-100'
    case 'Info':
      return 'text-cyan-600 dark:bg-cyan-700 dark:text-cyan-100'
    case 'Warning':
      return 'text-yellow-600 dark:bg-yellow-600 dark:text-yellow-100'
    case 'Error':
      return 'text-red-500 dark:bg-red-500 dark:text-red-100'
    default:
      return 'text-gray-800 dark:bg-gray-800 dark:text-gray-100'
  }
}

/* Event handlers in template:
   - @click="() => emit('sort-by','level')"
   - @change="e => emit('time-sort-changed', e.target.value)"
   etc.
*/
</script>

<template>
  <div class="overflow-auto rounded">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr>
          <!-- LEVEL -->
          <th
            class="p-1.5 font-semibold text-xs cursor-pointer select-none w-24"
            @click="() => emit('sort-by', 'level')"
          >
            <div class="flex items-center">
              <span>Level</span>
              <SortIcon :field="'level'" :sortField="sortField" :sortDir="sortDir" />
            </div>
          </th>

          <!-- TIME -->
          <th
            class="p-1.5 font-semibold text-xs cursor-pointer select-none w-36"
            @click="() => emit('sort-by', 'time')"
          >
            <div class="flex items-center">
              <span>Time</span>
              <SortIcon :field="'time'" :sortField="sortField" :sortDir="sortDir" />
            </div>
          </th>

          <!-- ENV -->
          <th
            class="p-1.5 font-semibold text-xs cursor-pointer select-none w-36"
            @click="() => emit('sort-by', 'env')"
          >
            <div class="flex items-center">
              <span>Env</span>
              <SortIcon :field="'env'" :sortField="sortField" :sortDir="sortDir" />
            </div>
          </th>

          <!-- DESCRIPTION + DROPDOWNS -->
          <th
            class="p-1.5 font-semibold text-xs cursor-pointer select-none"
            @click="() => emit('sort-by', 'description')"
          >
            <div class="flex items-center justify-between">
              <!-- Left: 'Description' label + SortIcon -->
              <div class="flex items-center space-x-1">
                <span>Description</span>
                <SortIcon :field="'description'" :sortField="sortField" :sortDir="sortDir" />
              </div>

              <!-- Right: Two dropdowns (time sort + items per page) -->
              <div class="flex items-center space-x-2 ml-2">
                <!-- Sort by Time Asc/Desc -->
                <select
                  class="p-1 text-xs dark:text-gray-300"
                  @change="e => emit('time-sort-changed', e.target.value)"
                  @click.stop
                >
                  <option value="asc">Newest first</option>
                  <option value="desc">Oldest first</option>
                </select>

                <!-- Items per Page -->
                <select
                  class="p-1 text-xs dark:text-gray-300"
                  @change="e => emit('page-size-changed', parseInt(e.target.value))"
                  @click.stop
                >
                  <option value="5">5 items per page</option>
                  <option value="10">10 items per page</option>
                  <option value="12" selected>12 items per page</option>
                  <option value="15">15 items per page</option>
                  <option value="20">20 items per page</option>
                </select>
              </div>
            </div>
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="(log, index) in props.logs"
          :key="index"
          class="border-b border-1 border-gray-200 dark:border-black"
          :class="index % 2 === 0
            ? 'bg-white dark:bg-gray-700'
            : 'bg-white dark:bg-gray-700'"
        >
          <!-- LEVEL with icon -->
          <td class="p-1.5">
            <div class="flex items-center space-x-2">
              <!-- Heroicon component -->
              <component
                :is="iconForLevel(log.level)"
                class="w-4 h-4"
                :class="iconColorClass(log.level)"
              />
              <span
                class="px-2 py-1 text-xs font-medium rounded"
                :class="badgeClass(log.level)"
              >
                {{ log.level }}
              </span>
            </div>
          </td>
          <!-- TIME -->
          <td class="p-1.5 text-xs">
            {{ log.time }}
          </td>
          <!-- ENV -->
          <td class="p-1.5 text-xs">
            {{ log.env }}
          </td>
          <!-- DESCRIPTION -->
          <td class="p-1.5 whitespace-pre-wrap text-xs">
            {{ log.description }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Child-level styling if needed */
</style>
