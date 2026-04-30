import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { dirname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import mime from 'mime-types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicRoot = normalize(join(__dirname, '../../resources/logs_viewer'))

export default class LogsViewerController {
  async index({ response }: HttpContext) {
    response.type('text/html; charset=utf-8')

    if (!app.inProduction) {
      const viteOrigin = process.env.LOGS_VITE_ORIGIN ?? 'http://localhost:5173'
      // Frontend Vite is configured with `base: '/logs/assets/'`
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
