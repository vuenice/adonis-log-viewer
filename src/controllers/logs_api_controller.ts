import type { HttpContext } from '@adonisjs/core/http'
import { LogViewerRuntime } from '../bindings.js'
import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { basename, join, normalize } from 'node:path'

type LogFileItem = {
  name: string
  size: number
  mtimeMs: number
}

type OpenResponse = {
  file: LogFileItem
  columns: string[]
  limit: number
  cursor: number
  nextCursor: number | null
  rows: Record<string, string>[]
}

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 2000
const READ_CHUNK_BYTES = 1024 * 1024      // 1 MB — 4× larger than before, fewer I/O round-trips
const COUNT_CHUNK_BYTES = 8 * 1024 * 1024 // 8 MB — fast line counting for large files

// In-memory column cache keyed by filePath:mtime.
// Avoids re-deriving columns on every chunk request.
const columnCache = new Map<string, string[]>()

function columnCacheKey(filePath: string, mtimeMs: number) {
  return `${filePath}:${mtimeMs}`
}

function safeBasename(name: string) {
  const base = basename(name || '')
  if (!base || base.includes('/') || base.includes('\\') || base === '.' || base === '..') {
    return null
  }
  return base
}

/**
 * Format a single log line into a column-keyed row object.
 * Fast path for non-JSON lines (HTML, plain text) skips JSON.parse entirely,
 * avoiding the try/catch overhead that V8 pessimises in hot loops.
 */
function formatRow(line: string, columns: string[]): Record<string, string> {
  const first = columns[0] ?? 'raw'

  if (!line.startsWith('{')) {
    const row: Record<string, string> = { [first]: line }
    for (const c of columns.slice(1)) row[c] = ''
    return row
  }

  try {
    const parsed = JSON.parse(line)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { [first]: line, ...Object.fromEntries(columns.slice(1).map((c) => [c, ''])) }
    }

    const obj = parsed as Record<string, unknown>
    const row: Record<string, string> = {}
    for (const c of columns) {
      if (Object.prototype.hasOwnProperty.call(obj, c)) {
        const v = obj[c]
        row[c] = v === undefined || v === null ? '' : String(v)
      } else if (c === 'raw') {
        row[c] = line
      } else {
        row[c] = ''
      }
    }
    return row
  } catch {
    const row: Record<string, string> = {}
    row[first] = line
    for (const c of columns.slice(1)) row[c] = ''
    return row
  }
}

/** Infer column names by scanning sampled lines for the first valid JSON object. */
function detectColumns(lines: string[]): string[] {
  for (const line of lines) {
    if (!line.startsWith('{')) continue
    try {
      const parsed = JSON.parse(line)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed as Record<string, unknown>)
        if (keys.length) return keys
      }
    } catch {
      // ignore
    }
  }
  return ['raw']
}

async function listLogFiles(logsDir: string): Promise<LogFileItem[]> {
  const entries = await readdir(logsDir, { withFileTypes: true })
  const files: LogFileItem[] = []

  for (const e of entries) {
    if (!e.isFile()) continue
    const name = e.name
    if (!name.toLowerCase().endsWith('.log')) continue
    const s = await stat(join(logsDir, name))
    files.push({ name, size: s.size, mtimeMs: s.mtimeMs })
  }

  files.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return files
}

async function resolveLogFile(logsDir: string, fileName: string) {
  const safe = safeBasename(fileName)
  if (!safe || !safe.toLowerCase().endsWith('.log')) return null

  const fullPath = normalize(join(logsDir, safe))
  if (!fullPath.startsWith(normalize(logsDir))) return null

  try {
    const s = await stat(fullPath)
    if (!s.isFile()) return null
    return { safeName: safe, fullPath, stat: s }
  } catch {
    return null
  }
}

/**
 * Core streaming reader — returns raw (unformatted) lines plus byte-offset cursors.
 *
 * Reading raw lines first lets the caller detect columns from the batch and then
 * format everything in one pass, eliminating the old double-read pattern
 * (deriveColumns + readChunk were two separate stream reads of the same file).
 *
 * The 'close' event handler ensures the returned Promise always settles even when
 * stream.destroy() is called mid-stream after the row limit is reached.
 */
async function readRawLines(
  logFilePath: string,
  start: number,
  limit: number,
): Promise<{ rawLines: string[]; cursor: number; nextCursor: number | null }> {
  const rawLines: string[] = []
  const cursor = Math.max(0, Number.isFinite(start) ? start : 0)
  let nextCursor: number | null = null

  const stream = createReadStream(logFilePath, { start: cursor, highWaterMark: READ_CHUNK_BYTES })
  let carry: Buffer = Buffer.alloc(0)
  let dataStartOffset = cursor
  let absoluteReadOffset = cursor

  const closeStream = () => {
    try {
      stream.destroy()
    } catch {
      // ignore
    }
  }

  let settled = false
  return await new Promise((resolve, reject) => {
    const finish = () => {
      if (!settled) {
        settled = true
        resolve({ rawLines, cursor, nextCursor })
      }
    }

    stream.on('data', (chunk: string | Buffer) => {
      if (typeof chunk === 'string') chunk = Buffer.from(chunk)
      if (rawLines.length >= limit) return

      dataStartOffset = absoluteReadOffset - carry.length
      absoluteReadOffset += chunk.length

      const data = carry.length ? Buffer.concat([carry, chunk]) : chunk
      let lineStart = 0

      for (let i = 0; i < data.length && rawLines.length < limit; i++) {
        if (data[i] !== 0x0a) continue

        let lineBuf = data.subarray(lineStart, i)
        if (lineBuf.length && lineBuf[lineBuf.length - 1] === 0x0d) {
          lineBuf = lineBuf.subarray(0, lineBuf.length - 1)
        }

        rawLines.push(lineBuf.toString('utf8'))
        nextCursor = dataStartOffset + i + 1
        lineStart = i + 1
      }

      if (rawLines.length >= limit) {
        closeStream()
        return
      }

      carry = data.subarray(lineStart)
    })

    stream.on('end', () => {
      if (rawLines.length < limit && carry.length) {
        rawLines.push(carry.toString('utf8'))
        nextCursor = absoluteReadOffset
      }
      finish()
    })

    // 'close' fires after destroy() — guarantees the Promise always settles
    stream.on('close', finish)

    stream.on('error', (err) => {
      if (!settled) {
        settled = true
        reject(err)
      }
    })
  })
}

async function countLinesStreaming(logFilePath: string) {
  return await new Promise<number>((resolve, reject) => {
    let count = 0
    let lastByteWasNewline = false

    const stream = createReadStream(logFilePath, { highWaterMark: COUNT_CHUNK_BYTES })
    stream.on('data', (chunk: string | Buffer) => {
      const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
      for (let i = 0; i < buf.length; i++) {
        if (buf[i] === 0x0a) count++
      }
      lastByteWasNewline = buf.length ? buf[buf.length - 1] === 0x0a : lastByteWasNewline
    })
    stream.on('end', () => {
      if (!lastByteWasNewline) {
        stat(logFilePath)
          .then((s) => resolve(s.size ? count + 1 : 0))
          .catch(() => resolve(count))
      } else {
        resolve(count)
      }
    })
    stream.on('error', (err) => reject(err))
  })
}

export default class LogsApiController {
  private async logsDirectory({ containerResolver }: HttpContext) {
    const runtime = await containerResolver.make(LogViewerRuntime)
    return runtime.logsDirectory
  }

  async files(ctx: HttpContext) {
    const { response } = ctx
    const files = await listLogFiles(await this.logsDirectory(ctx))
    return response.ok({ logsDir: 'logs', files })
  }

  async open(ctx: HttpContext) {
    const { request, response } = ctx
    const logsDir = await this.logsDirectory(ctx)
    const fileName = String(request.input('file') ?? '')
    const resolved = await resolveLogFile(logsDir, fileName)
    if (!resolved) return response.notFound({ message: 'Log file not found' })

    const limitRaw = Number(request.input('limit') ?? DEFAULT_LIMIT)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_LIMIT))

    const cacheKey = columnCacheKey(resolved.fullPath, resolved.stat.mtimeMs)

    // Single read pass: collect raw lines, detect columns, format — no double-read.
    const { rawLines, cursor, nextCursor } = await readRawLines(resolved.fullPath, 0, limit)

    let columns = columnCache.get(cacheKey) ?? null
    if (!columns) {
      columns = detectColumns(rawLines)
      if (columnCache.size >= 50) columnCache.clear()
      columnCache.set(cacheKey, columns)
    }

    const rows = rawLines.map((line) => formatRow(line, columns!))

    const body: OpenResponse = {
      file: { name: resolved.safeName, size: resolved.stat.size, mtimeMs: resolved.stat.mtimeMs },
      columns,
      limit,
      cursor,
      nextCursor,
      rows,
    }

    return response.ok(body)
  }

  async chunk(ctx: HttpContext) {
    const { request, response } = ctx
    const logsDir = await this.logsDirectory(ctx)
    const fileName = String(request.input('file') ?? '')
    const resolved = await resolveLogFile(logsDir, fileName)
    if (!resolved) return response.notFound({ message: 'Log file not found' })

    const cursorRaw = Number(request.input('cursor') ?? 0)
    const cursor = Math.max(0, Number.isFinite(cursorRaw) ? cursorRaw : 0)

    const limitRaw = Number(request.input('limit') ?? DEFAULT_LIMIT)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_LIMIT))

    const columnsRaw = request.input('columns')
    let columns: string[]
    if (Array.isArray(columnsRaw) && columnsRaw.every((c) => typeof c === 'string') && columnsRaw.length) {
      columns = columnsRaw as string[]
    } else {
      // Check column cache before falling back to a file scan
      const cacheKey = columnCacheKey(resolved.fullPath, resolved.stat.mtimeMs)
      const cached = columnCache.get(cacheKey)
      if (cached) {
        columns = cached
      } else {
        const sample = await readRawLines(resolved.fullPath, 0, 50)
        columns = detectColumns(sample.rawLines)
        if (columnCache.size >= 50) columnCache.clear()
        columnCache.set(cacheKey, columns)
      }
    }

    const { rawLines, nextCursor } = await readRawLines(resolved.fullPath, cursor, limit)
    const rows = rawLines.map((line) => formatRow(line, columns))

    return response.ok({
      file: { name: resolved.safeName, size: resolved.stat.size, mtimeMs: resolved.stat.mtimeMs },
      columns,
      limit,
      cursor,
      nextCursor,
      rows,
    })
  }

  async count(ctx: HttpContext) {
    const { request, response } = ctx
    const logsDir = await this.logsDirectory(ctx)
    const fileName = String(request.input('file') ?? '')
    const resolved = await resolveLogFile(logsDir, fileName)
    if (!resolved) return response.notFound({ message: 'Log file not found' })

    const lineCount = await countLinesStreaming(resolved.fullPath)
    return response.ok({
      file: { name: resolved.safeName, size: resolved.stat.size, mtimeMs: resolved.stat.mtimeMs },
      lineCount,
    })
  }
}
