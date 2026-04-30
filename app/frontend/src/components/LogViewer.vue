<script setup>
/* Imports */
import { ref, computed } from 'vue'
import LogSidebar from './LogSidebar.vue'
import LogTable from './LogTable.vue'
import LogCounters from './LogCounters.vue'
import {
  Cog8ToothIcon,
  MoonIcon,
  ArrowLongRightIcon,
  ArrowLongLeftIcon
} from '@heroicons/vue/24/solid'

/* Reactive State */
const isDarkMode = ref(false)
const isSettingsOpen = ref(false)

// Search, sorting, pagination
const searchTerm = ref('')
const sortField = ref('')
const sortDir = ref(null) // 'asc' or 'desc'
const currentPage = ref(1)
const pageSize = ref(12)

/* Example list of log files (sidebar) */
const logFiles = ref([
{ name: 'laravel.log', size: '1.2MB' },
        { name: 'system.log', size: '3.4MB' },
        { name: 'app.log', size: '500kB' },
        { name: 'nginx.log', size: '2.2MB' },
        { name: 'db.log', size: '4.1MB' },
        { name: 'laravel.log', size: '1.2MB' },
        { name: 'system.log', size: '3.4MB' },
        { name: 'app.log', size: '500kB' },
        { name: 'nginx.log', size: '2.2MB' },
        { name: 'db.log', size: '4.1MB' },{ name: 'laravel.log', size: '1.2MB' },
        { name: 'system.log', size: '3.4MB' },
        { name: 'app.log', size: '500kB' },
        { name: 'nginx.log', size: '2.2MB' },
        { name: 'db.log', size: '4.1MB' },{ name: 'laravel.log', size: '1.2MB' },
        { name: 'system.log', size: '3.4MB' },
        { name: 'app.log', size: '500kB' },
        { name: 'nginx.log', size: '2.2MB' },
        { name: 'db.log', size: '4.1MB' },{ name: 'laravel.log', size: '1.2MB' },
        { name: 'system.log', size: '3.4MB' },
        { name: 'app.log', size: '500kB' },
        { name: 'nginx.log', size: '2.2MB' },
        { name: 'db.log', size: '4.1MB' },
])

/* Example logs data */
const logs = ref([
{ level: 'Debug',   time: '09:00:12', env: 'local',       description: 'Debug message #1' },
      { level: 'Info',    time: '09:05:33', env: 'production',  description: 'Info message #2' },
      { level: 'Warning', time: '09:10:45', env: 'staging',     description: 'Warning message #3' },
      { level: 'Error',   time: '09:20:12', env: 'local',       description: 'Error message #4' },
      { level: 'Debug',   time: '09:22:56', env: 'production',  description: 'Debug message #5' },
      { level: 'Info',    time: '09:30:10', env: 'production',  description: 'Info message #6' },
      { level: 'Warning', time: '09:35:27', env: 'staging',     description: 'Warning message #7' },
      { level: 'Error',   time: '09:40:55', env: 'local',       description: 'Error message #8' },
      { level: 'Debug',   time: '09:45:00', env: 'local',       description: 'Debug message #9' },
      { level: 'Info',    time: '09:50:33', env: 'production',  description: 'Info message #10' },

      { level: 'Warning', time: '09:55:45', env: 'staging',     description: 'Warning message #11' },
      { level: 'Error',   time: '10:00:12', env: 'local',       description: 'Error message #12' },
      { level: 'Debug',   time: '10:05:12', env: 'production',  description: 'Debug message #13' },
      { level: 'Info',    time: '10:10:33', env: 'production',  description: 'Info message #14' },
      { level: 'Warning', time: '10:15:45', env: 'staging',     description: 'Warning message #15' },
      { level: 'Error',   time: '10:20:12', env: 'local',       description: 'Error message #16' },
      { level: 'Debug',   time: '10:22:56', env: 'production',  description: 'Debug message #17' },
      { level: 'Info',    time: '10:30:21', env: 'production',  description: 'Info message #18' },
      { level: 'Warning', time: '10:35:12', env: 'staging',     description: 'Warning message #19' },
      { level: 'Error',   time: '10:40:55', env: 'local',       description: 'Error message #20' },

      {
         level: 'Debug',   time: '10:45:00', env: 'local',       description: 'Debug message #21' },
      { level: 'Info',    time: '10:50:33', env: 'production',  description: 'Info message #22' },
      { level: 'Warning', time: '10:55:45', env: 'staging',     description: 'Warning message #23' },
      { level: 'Error',   time: '11:00:12', env: 'local',       description: 'Error message #24' },
      { level: 'Debug',   time: '11:05:12', env: 'production',  description: 'Debug message #25' },
      { level: 'Info',    time: '11:10:33', env: 'production',  description: 'Info message #26' },
      { level: 'Warning', time: '11:15:45', env: 'staging',     description: 'Warning message #27' },
      { level: 'Error',   time: '11:20:12', env: 'local',       description: 'Error message #28' },
      { level: 'Debug',   time: '11:22:56', env: 'production',  description: 'Debug message #29' },
      { level: 'Info',    time: '11:30:21', env: 'production',  description: 'Info message #30' },
      {
         level: 'Debug',   time: '10:45:00', env: 'local',       description: 'Debug message #21' },
      { level: 'Info',    time: '10:50:33', env: 'production',  description: 'Info message #22' },
      { level: 'Warning', time: '10:55:45', env: 'staging',     description: 'Warning message #23' },
      { level: 'Error',   time: '11:00:12', env: 'local',       description: 'Error message #24' },
      { level: 'Debug',   time: '11:05:12', env: 'production',  description: 'Debug message #25' },
      { level: 'Info',    time: '11:10:33', env: 'production',  description: 'Info message #26' },
      { level: 'Warning', time: '11:15:45', env: 'staging',     description: 'Warning message #27' },
      { level: 'Error',   time: '11:20:12', env: 'local',       description: 'Error message #28' },
      { level: 'Debug',   time: '11:22:56', env: 'production',  description: 'Debug message #29' },
      { level: 'Info',    time: '11:30:21', env: 'production',  description: 'Info message #30' },
])

/* Computed: Filter logs by searchTerm */
const filteredLogs = computed(() => {
  if (!searchTerm.value) return logs.value
  const term = searchTerm.value.toLowerCase()
  return logs.value.filter(log =>
    Object.values(log).some(val => String(val).toLowerCase().includes(term))
  )
})

/* Computed: Sort logs by selected field */
const sortedLogs = computed(() => {
  if (!sortField.value) return filteredLogs.value
  const sorted = [...filteredLogs.value]
  sorted.sort((a, b) => {
    const valA = a[sortField.value]
    const valB = b[sortField.value]
    if (valA < valB) return sortDir.value === 'asc' ? -1 : 1
    if (valA > valB) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
  return sorted
})

/* Computed: Paginated logs */
const pagedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return sortedLogs.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredLogs.value.length / pageSize.value)
})

const startIndex = computed(() => {
  return (currentPage.value - 1) * pageSize.value
})

const endIndex = computed(() => {
  const idx = startIndex.value + pageSize.value
  return idx > filteredLogs.value.length ? filteredLogs.value.length : idx
})

/* Methods */
function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
}

function openSettings() {
  isSettingsOpen.value = true
}

function handleSearch() {
  // Reset to page 1 whenever search changes
  currentPage.value = 1
}

function sortBy(field) {
  if (sortField.value === field) {
    // Toggle direction
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'asc'
  }
  currentPage.value = 1
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function goToPage(p) {
  currentPage.value = p
}

function onTimeSortChanged(direction) {
  // direction is 'asc' or 'desc'
  sortField.value = 'time'
  sortDir.value = direction
  currentPage.value = 1
}

function onPageSizeChanged(newSize) {
  pageSize.value = newSize
  currentPage.value = 1
}
</script>

<template>
  <!-- Toggle dark mode via 'dark' class -->
  <div :class="isDarkMode ? 'dark' : ''">
    <div class="sm:flex block transition-colors bg-gray-100 dark:bg-gray-900 dark:text-white">
      <!-- LEFT SIDEBAR -->
      <LogSidebar
        :logFiles="logFiles"
        class="sm:max-h-screen"
      />

      <!-- MAIN CONTENT -->
      <div class="flex-1 flex flex-col p-4">
        <!-- Header: Title + Search -->
        <header class="flex items-center gap-4 mb-4">
          <!-- Counters (left) -->
          <LogCounters
            :debugCount="2595"
            :infoCount="2491"
            :warningCount="2442"
            :errorCount="2475"
          />

          <!-- Search + Icons (right) -->
          <div class="sm:flex items-center ml-auto space-x-2">
            <!-- Search input -->
            <input
              v-model="searchTerm"
              @input="handleSearch"
              type="text"
              placeholder="Search logs..."
              class="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm bg-white text-gray-600 dark:bg-gray-800 dark:text-white"
            />

            <!-- Settings button -->
            <button
              class="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              @click="openSettings"
            >
              <Cog8ToothIcon class="w-5 h-5" />
            </button>

            <!-- Dark mode toggle button -->
            <button
              class="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              @click="toggleDarkMode"
            >
              <MoonIcon class="w-5 h-5" />
            </button>
          </div>
        </header>

        <!-- Log Table -->
        <LogTable
          :logs="pagedLogs"
          :sortField="sortField"
          :sortDir="sortDir"
          @sort-by="sortBy"
          @time-sort-changed="onTimeSortChanged"
          @page-size-changed="onPageSizeChanged"
        />

        <!-- Pagination -->
        <div class="flex items-center justify-center mt-4">
          <div class="space-x-1">
            <button
              class="px-3 py-1 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              :disabled="currentPage === 1"
              @click="prevPage"
            >
              <ArrowLongLeftIcon class="w-4 h-4"/>
            </button>
            <button
              v-for="p in totalPages"
              :key="p"
              class="px-3 py-1"
              :class="{
                'border-t-emerald-400 border-t-2 text-emerald-400': p === currentPage,
                'hover:bg-gray-200 text-gray-600 dark:text-gray-300 dark:hover:bg-gray-700': p !== currentPage
              }"
              @click="goToPage(p)"
            >
              {{ p }}
            </button>
            <button
              class="px-3 py-1 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              :disabled="currentPage === totalPages"
              @click="nextPage"
            >
              <ArrowLongRightIcon class="w-4 h-4"/>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Parent-level styling if needed */
</style>
