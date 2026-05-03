<script setup>
/* Imports */
import { ref, computed, onMounted } from 'vue'
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

// Search + sorting (applies to current chunk)
const searchTerm = ref('')
const sortField = ref('')
const sortDir = ref(null) // 'asc' or 'desc'
const pageSize = ref(200)

const logFiles = ref([])
const activeFile = ref('')
const columns = ref([])
const logs = ref([])
const cursor = ref(0)
const nextCursor = ref(null)
const cursorHistory = ref([])
const lineCount = ref(null)
const isLoadingFiles = ref(false)
const isLoadingLogs = ref(false)
const isCountingLines = ref(false)
const errorMessage = ref('')

/** Pino / Adonis JSON logs use numeric levels (e.g. 30 = info). Map to counter buckets. */
function levelBucket(level) {
  const s = String(level ?? '').trim().toLowerCase()
  if (s === 'error' || s === 'fatal' || s === '50' || s === '60') return 'error'
  if (s === 'warn' || s === 'warning' || s === '40') return 'warning'
  if (s === 'info' || s === '30') return 'info'
  if (s === 'debug' || s === 'trace' || s === '10' || s === '20') return 'debug'
  const n = Number(level)
  if (Number.isFinite(n)) {
    if (n >= 50) return 'error'
    if (n >= 40) return 'warning'
    if (n >= 30) return 'info'
    return 'debug'
  }
  if (s === '') return null
  return null
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let idx = 0
  let v = bytes
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024
    idx++
  }
  return `${v.toFixed(idx === 0 ? 0 : 1)}${units[idx]}`
}

async function apiGet(path, params = {}) {
  const url = new URL(path, window.location.origin)
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(k, String(item))
      continue
    }
    url.searchParams.set(k, String(v))
  }
  const res = await fetch(url.toString(), { headers: { accept: 'application/json' } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return await res.json()
}

async function loadFiles() {
  isLoadingFiles.value = true
  errorMessage.value = ''
  try {
    const data = await apiGet('/api/v1/logs/files')
    logFiles.value = (data.files ?? []).map((f) => ({
      name: f.name,
      size: formatBytes(f.size),
      _rawSize: f.size,
      mtimeMs: f.mtimeMs,
    }))
    if (!activeFile.value && logFiles.value.length) {
      await openFile(logFiles.value[0])
    }
  } catch (e) {
    errorMessage.value = e?.message ?? String(e)
  } finally {
    isLoadingFiles.value = false
  }
}

async function openFile(file) {
  if (!file?.name) return
  activeFile.value = file.name
  cursor.value = 0
  nextCursor.value = null
  cursorHistory.value = []
  lineCount.value = null
  errorMessage.value = ''

  isLoadingLogs.value = true
  try {
    const data = await apiGet('/api/v1/logs/open', { file: file.name, limit: pageSize.value })
    columns.value = data.columns ?? []
    logs.value = data.rows ?? []
    cursor.value = data.cursor ?? 0
    nextCursor.value = data.nextCursor ?? null
    sortField.value = ''
    sortDir.value = null
    searchTerm.value = ''
  } catch (e) {
    errorMessage.value = e?.message ?? String(e)
    columns.value = []
    logs.value = []
  } finally {
    isLoadingLogs.value = false
  }

  // lazy line counting (can be slow on huge files)
  isCountingLines.value = true
  apiGet('/api/v1/logs/count', { file: file.name })
    .then((data) => {
      lineCount.value = data.lineCount ?? null
    })
    .catch(() => {
      lineCount.value = null
    })
    .finally(() => {
      isCountingLines.value = false
    })
}

async function loadChunk(targetCursor) {
  if (!activeFile.value) return
  isLoadingLogs.value = true
  errorMessage.value = ''
  try {
    const data = await apiGet('/api/v1/logs/chunk', {
      file: activeFile.value,
      cursor: targetCursor,
      limit: pageSize.value,
      columns: columns.value,
    })
    columns.value = data.columns ?? columns.value
    logs.value = data.rows ?? []
    cursor.value = data.cursor ?? targetCursor
    nextCursor.value = data.nextCursor ?? null
  } catch (e) {
    errorMessage.value = e?.message ?? String(e)
  } finally {
    isLoadingLogs.value = false
  }
}

async function nextChunk() {
  if (nextCursor.value === null || nextCursor.value === undefined) return
  cursorHistory.value.push(cursor.value)
  await loadChunk(nextCursor.value)
}

async function prevChunk() {
  if (!cursorHistory.value.length) return
  const prev = cursorHistory.value.pop()
  await loadChunk(prev)
}

/* Computed: Filter logs by searchTerm */
const filteredLogs = computed(() => {
  if (!searchTerm.value) return logs.value
  const term = searchTerm.value.toLowerCase()
  return logs.value.filter((log) =>
    Object.values(log ?? {}).some((val) => String(val ?? '').toLowerCase().includes(term))
  )
})

/* Computed: Sort logs by selected field */
const sortedLogs = computed(() => {
  if (!sortField.value) return filteredLogs.value
  const sorted = [...filteredLogs.value]
  sorted.sort((a, b) => {
    const valA = String(a?.[sortField.value] ?? '')
    const valB = String(b?.[sortField.value] ?? '')
    if (valA < valB) return sortDir.value === 'asc' ? -1 : 1
    if (valA > valB) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
  return sorted
})

const debugCount = computed(
  () => sortedLogs.value.filter((l) => levelBucket(l?.level) === 'debug').length
)
const infoCount = computed(
  () => sortedLogs.value.filter((l) => levelBucket(l?.level) === 'info').length
)
const warningCount = computed(
  () => sortedLogs.value.filter((l) => levelBucket(l?.level) === 'warning').length
)
const errorCount = computed(
  () => sortedLogs.value.filter((l) => levelBucket(l?.level) === 'error').length
)

/* Methods */
function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
}

function openSettings() {
  isSettingsOpen.value = true
}

function handleSearch() {
  // computed list updates automatically
}

function sortBy(field) {
  if (sortField.value === field) {
    // Toggle direction
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'asc'
  }
}

function onPageSizeChanged(newSize) {
  pageSize.value = newSize
  if (activeFile.value) openFile({ name: activeFile.value })
}

onMounted(() => {
  loadFiles()
})
</script>

<template>
  <!-- Toggle dark mode via 'dark' class -->
  <div :class="isDarkMode ? 'dark' : ''">
    <div class="sm:flex block transition-colors bg-gray-100 dark:bg-gray-900 dark:text-white">
      <!-- LEFT SIDEBAR -->
      <LogSidebar
        :logFiles="logFiles"
        :activeFile="activeFile"
        @file-selected="openFile"
        class="sm:max-h-screen"
      />

      <!-- MAIN CONTENT -->
      <div class="flex-1 flex flex-col p-4">
        <!-- Header: Title + Search -->
        <header class="flex items-center gap-4 mb-4">
          <!-- Counters (left) -->
          <LogCounters
            :debugCount="debugCount"
            :infoCount="infoCount"
            :warningCount="warningCount"
            :errorCount="errorCount"
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

        <div class="flex items-center justify-between mb-3 text-xs text-gray-600 dark:text-gray-300">
          <div class="flex items-center gap-3 min-w-0">
            <div v-if="activeFile" class="font-medium truncate">
              {{ activeFile }}
            </div>
            <div v-if="isCountingLines" class="opacity-70">Counting lines…</div>
            <div v-else-if="lineCount !== null" class="opacity-70">{{ lineCount }} lines</div>
            <div v-if="isLoadingFiles" class="opacity-70">Loading files…</div>
            <div v-if="isLoadingLogs" class="opacity-70">Loading logs…</div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              class="px-3 py-1 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40"
              :disabled="!cursorHistory.length || isLoadingLogs"
              @click="prevChunk"
            >
              <ArrowLongLeftIcon class="w-4 h-4 inline-block" />
              Prev chunk
            </button>
            <button
              class="px-3 py-1 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40"
              :disabled="nextCursor === null || isLoadingLogs"
              @click="nextChunk"
            >
              Next chunk
              <ArrowLongRightIcon class="w-4 h-4 inline-block" />
            </button>
          </div>
        </div>

        <div v-if="errorMessage" class="mb-3 p-2 rounded bg-red-50 text-red-700 text-xs">
          {{ errorMessage }}
        </div>

        <!-- Log Table -->
        <LogTable
          :columns="columns"
          :logs="sortedLogs"
          :sortField="sortField"
          :sortDir="sortDir"
          @sort-by="sortBy"
          @page-size-changed="onPageSizeChanged"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Parent-level styling if needed */
</style>
