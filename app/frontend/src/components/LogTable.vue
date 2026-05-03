<!-- LogTable.vue -->
<script setup>
import { ref, watch, onUnmounted, defineProps, defineEmits } from 'vue'
import SortIcon from './SortIcon.vue'

/* Define Props */
const props = defineProps({
  columns: {
    type: Array,
    default: () => [],
  },
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
const emit = defineEmits(['sort-by', 'page-size-changed'])

const TIME_COLUMNS = new Set(['time', 'timestamp'])
const MESSAGE_COLUMNS = new Set(['msg', 'message'])

const modalOpen = ref(false)
const modalTitle = ref('')
const modalBody = ref('')

function isMessageColumn(col) {
  return MESSAGE_COLUMNS.has(String(col).toLowerCase())
}

function fullCellText(col, raw) {
  if (raw === null || raw === undefined) return ''
  if (typeof raw === 'object') return JSON.stringify(raw, null, 2)
  return String(formatCell(col, raw))
}

function openMessageModal(col, raw) {
  modalTitle.value = String(col)
  modalBody.value = fullCellText(col, raw)
  modalOpen.value = true
}

function closeMessageModal() {
  modalOpen.value = false
}

function headerCellClass(col, idx) {
  if (isMessageColumn(col)) return 'w-[45%] min-w-0'
  if (idx === 0) return 'w-[18%] min-w-0'
  return 'min-w-0'
}

function onModalKeydown(e) {
  if (e.key === 'Escape') closeMessageModal()
}

watch(modalOpen, (open) => {
  if (open) document.addEventListener('keydown', onModalKeydown)
  else document.removeEventListener('keydown', onModalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onModalKeydown)
})

/** Render log timestamps in the viewer's locale and local timezone. */
function formatLogTime(value) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
  }
  const s = String(value).trim()
  if (/^\d{10}$/.test(s)) {
    const d = new Date(Number(s) * 1000)
    return Number.isNaN(d.getTime()) ? s : d.toLocaleString()
  }
  if (/^\d{13}$/.test(s)) {
    const d = new Date(Number(s))
    return Number.isNaN(d.getTime()) ? s : d.toLocaleString()
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString()
}

function formatCell(col, value) {
  if (TIME_COLUMNS.has(String(col).toLowerCase())) {
    return formatLogTime(value)
  }
  return value ?? ''
}

/* Event handlers in template:
   - @click="() => emit('sort-by','level')"
   - @change="e => emit('time-sort-changed', e.target.value)"
   etc.
*/
</script>

<template>
  <div class="overflow-auto rounded min-w-0">
    <Teleport to="body">
      <div
        v-if="modalOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-msg-modal-title"
        @click.self="closeMessageModal"
      >
        <div
          class="max-w-3xl w-full max-h-[80vh] flex flex-col rounded-lg bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700"
          @click.stop
        >
          <div class="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <h2 id="log-msg-modal-title" class="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {{ modalTitle }}
            </h2>
            <button
              type="button"
              class="shrink-0 rounded px-2 py-1 text-lg leading-none text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Close"
              @click="closeMessageModal"
            >
              ×
            </button>
          </div>
          <div class="overflow-auto p-4 text-xs text-gray-800 dark:text-gray-200">
            <pre class="whitespace-pre-wrap break-words font-sans m-0">{{ modalBody }}</pre>
          </div>
        </div>
      </div>
    </Teleport>

    <table class="w-full table-fixed text-left border-collapse min-w-0">
      <thead>
        <tr>
          <th
            v-for="(col, idx) in props.columns"
            :key="col"
            class="p-1.5 font-semibold text-xs cursor-pointer select-none"
            :class="headerCellClass(col, idx)"
            @click="() => emit('sort-by', col)"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center space-x-1">
                <span class="truncate">{{ col }}</span>
                <SortIcon :field="col" :sortField="sortField" :sortDir="sortDir" />
              </div>

              <div v-if="idx === props.columns.length - 1" class="flex items-center space-x-2 ml-2">
                <select
                  class="p-1 text-xs dark:text-gray-300"
                  @change="e => emit('page-size-changed', parseInt(e.target.value))"
                  @click.stop
                >
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200" selected>200</option>
                  <option value="500">500</option>
                  <option value="1000">1000</option>
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
          <td
            v-for="col in props.columns"
            :key="col"
            class="p-1.5 text-xs align-top min-w-0"
            :class="isMessageColumn(col) ? '' : 'break-words whitespace-pre-wrap'"
          >
            <button
              v-if="isMessageColumn(col)"
              type="button"
              class="w-full max-w-full text-left truncate text-gray-800 dark:text-gray-100 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 rounded-sm"
              :title="'View full ' + col"
              @click="openMessageModal(col, log?.[col])"
            >
              {{ formatCell(col, log?.[col]) }}
            </button>
            <template v-else>{{ formatCell(col, log?.[col]) }}</template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Child-level styling if needed */
</style>
