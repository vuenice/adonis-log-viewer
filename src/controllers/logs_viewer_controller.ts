import type { HttpContext } from '@adonisjs/core/http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import mime from 'mime-types'

const publicRoot = normalize(
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'resources', 'logs_viewer')
)

function envTruthy(name: string): boolean {
  const v = process.env[name]
  if (v === undefined) return false
  return /^(1|true|yes)$/i.test(v.trim())
}

/** Optional override: force same-origin built assets in dev (e.g. if `LOGS_VITE_DEV` is set but you want a quick static check). */
function logsUseBuiltUiFromEnv(): boolean {
  return envTruthy('LOGS_USE_BUILT_UI')
}

/** Dev only: load `/logs` HTML from the Vite dev server (HMR). Default in development is built `/logs/assets/*` so consumers need no `:5173` process. */
function logsViteDevFromEnv(): boolean {
  return envTruthy('LOGS_VITE_DEV')
}

export default class LogsViewerController {
  async index({ response, containerResolver }: HttpContext) {
    response.type('text/html; charset=utf-8')

    const appInstance = (await containerResolver.make('app')) as { inProduction: boolean }

    const useViteDevShell =
      !appInstance.inProduction && !logsUseBuiltUiFromEnv() && logsViteDevFromEnv()

    if (useViteDevShell) {
      const viteOrigin = process.env.LOGS_VITE_ORIGIN ?? 'http://localhost:5173'
      const viteBase = process.env.LOGS_VITE_BASE ?? '/logs/assets'

      return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Logs</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="${viteOrigin}${viteBase}/@vite/client"></script>
    <script type="module" src="${viteOrigin}${viteBase}/src/main.js"></script>
  </body>
</html>`
    }

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Logs</title>
    <link rel="stylesheet" href="/logs/assets/app.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/logs/assets/app.js"></script>
  </body>
</html>`
  }

  async asset({ request, response }: HttpContext) {
    const wildcard = request.param('*')
    const requested = Array.isArray(wildcard) ? wildcard.join('/') : wildcard

    const filePath = normalize(join(publicRoot, requested || ''))
    if (!filePath.startsWith(publicRoot)) {
      return response.status(403)
    }

    try {
      const stats = await stat(filePath)
      if (!stats.isFile()) {
        return response.status(404)
      }

      const contentType = mime.lookup(filePath) || 'application/octet-stream'
      response.type(contentType)

      response.header('cache-control', 'public, max-age=0')
      return response.stream(createReadStream(filePath))
    } catch {
      return response.status(404)
    }
  }
}
