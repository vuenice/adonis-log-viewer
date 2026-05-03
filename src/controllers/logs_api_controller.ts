import type { HttpContext } from '@adonisjs/core/http'
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
const READ_CHUNK_BYTES = 256 * 1024

function safeBasename(name: string) {
  const base = basename(name || '')
  if (!base || base.includes('/') || base.includes('\\') || base === '.' || base === '..') {
    return null
  }
  return base
}

function formatRow(line: string, columns: string[]): Record<string, string> {
  const first = columns[0] ?? 'raw'

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

async function readChunk(logFilePath: string, start: number, limit: number, columns: string[]) {
  const rows: Record<string, string>[] = []
  let cursor = Math.max(0, Number.isFinite(start) ? start : 0)
  let nextCursor: number | null = null

  const stream = createReadStream(logFilePath, { start: cursor, highWaterMark: READ_CHUNK_BYTES })
  let carry: Buffer<ArrayBufferLike> = Buffer.alloc(0)
  let dataStartOffset = cursor
  let absoluteReadOffset = cursor

  const closeStream = () => {
    try {
      stream.destroy()
    } catch {
      // ignore
    }
  }

  return await new Promise<{ rows: Record<string, string>[]; cursor: number; nextCursor: number | null }>(
    (resolve, reject) => {
      stream.on('data', (chunk: string | Buffer) => {
        if (typeof chunk === 'string') {
          chunk = Buffer.from(chunk)
        }

        const buf = chunk
        if (rows.length >= limit) return

        dataStartOffset = absoluteReadOffset - carry.length
        absoluteReadOffset += buf.length

        const data = carry.length ? Buffer.concat([carry, buf]) : buf
        let lineStart = 0

        for (let i = 0; i < data.length && rows.length < limit; i++) {
          if (data[i] !== 0x0a) continue

          let lineBuf = data.subarray(lineStart, i)
          if (lineBuf.length && lineBuf[lineBuf.length - 1] === 0x0d) {
            lineBuf = lineBuf.subarray(0, lineBuf.length - 1)
          }

          const line = lineBuf.toString('utf8')
          rows.push(formatRow(line, columns))
          nextCursor = dataStartOffset + i + 1
          lineStart = i + 1
        }

        if (rows.length >= limit) {
          closeStream()
          return
        }

        carry = data.subarray(lineStart)
      })

      stream.on('end', () => {
        if (rows.length < limit && carry.length) {
          const line = carry.toString('utf8')
          rows.push(formatRow(line, columns))
          nextCursor = absoluteReadOffset
        }

        resolve({ rows, cursor, nextCursor })
      })

      stream.on('error', (err) => reject(err))
    }
  )
}

async function deriveColumns(logFilePath: string) {
  const sample = await readChunk(logFilePath, 0, 50, ['raw'])
  for (const row of sample.rows) {
    const raw = row.raw ?? ''
    try {
      const parsed = JSON.parse(raw)
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

async function countLinesStreaming(logFilePath: string) {
  return await new Promise<number>((resolve, reject) => {
    let count = 0
    let lastByteWasNewline = false

    const stream = createReadStream(logFilePath, { highWaterMark: 1024 * 1024 })
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
  async files({ response, containerResolver }: HttpContext) {
    const appInstance = (await containerResolver.make('app')) as { makePath(subPath: string): string }
    const logsDir = appInstance.makePath('logs')
    const files = await listLogFiles(logsDir)
    return response.ok({ logsDir: 'logs', files })
  }

  async open({ request, response, containerResolver }: HttpContext) {
    const appInstance = (await containerResolver.make('app')) as { makePath(subPath: string): string }
    const logsDir = appInstance.makePath('logs')
    const fileName = String(request.input('file') ?? '')
    const resolved = await resolveLogFile(logsDir, fileName)
    if (!resolved) return response.notFound({ message: 'Log file not found' })

    const limitRaw = Number(request.input('limit') ?? DEFAULT_LIMIT)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_LIMIT))

    const columns = await deriveColumns(resolved.fullPath)
    const chunk = await readChunk(resolved.fullPath, 0, limit, columns)

    const body: OpenResponse = {
      file: { name: resolved.safeName, size: resolved.stat.size, mtimeMs: resolved.stat.mtimeMs },
      columns,
      limit,
      cursor: chunk.cursor,
      nextCursor: chunk.nextCursor,
      rows: chunk.rows,
    }

    return response.ok(body)
  }

  async chunk({ request, response, containerResolver }: HttpContext) {
    const appInstance = (await containerResolver.make('app')) as { makePath(subPath: string): string }
    const logsDir = appInstance.makePath('logs')
    const fileName = String(request.input('file') ?? '')
    const resolved = await resolveLogFile(logsDir, fileName)
    if (!resolved) return response.notFound({ message: 'Log file not found' })

    const cursorRaw = Number(request.input('cursor') ?? 0)
    const cursor = Math.max(0, Number.isFinite(cursorRaw) ? cursorRaw : 0)

    const limitRaw = Number(request.input('limit') ?? DEFAULT_LIMIT)
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_LIMIT))

    const columnsRaw = request.input('columns')
    const columns =
      Array.isArray(columnsRaw) && columnsRaw.every((c) => typeof c === 'string') && columnsRaw.length
        ? (columnsRaw as string[])
        : await deriveColumns(resolved.fullPath)

    const chunk = await readChunk(resolved.fullPath, cursor, limit, columns)
    return response.ok({
      file: { name: resolved.safeName, size: resolved.stat.size, mtimeMs: resolved.stat.mtimeMs },
      columns,
      limit,
      cursor: chunk.cursor,
      nextCursor: chunk.nextCursor,
      rows: chunk.rows,
    })
  }

  async count({ request, response, containerResolver }: HttpContext) {
    const appInstance = (await containerResolver.make('app')) as { makePath(subPath: string): string }
    const logsDir = appInstance.makePath('logs')
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
