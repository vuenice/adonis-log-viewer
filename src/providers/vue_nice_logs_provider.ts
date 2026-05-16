import type { ApplicationService } from '@adonisjs/core/types'
import { LogViewerRuntime } from '../bindings.js'

const LogsViewerController = () => import('../controllers/logs_viewer_controller.js')
const LogsApiController = () => import('../controllers/logs_api_controller.js')

/**
 * Resolves host-app services from the container (not `@adonisjs/core/services/*`)
 * so `file:` / `npm link` installs do not load a second copy of `@adonisjs/core`.
 */
export default class VueNiceLogsProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(LogViewerRuntime, () => {
      return new LogViewerRuntime(this.app.makePath('logs'), this.app.inProduction)
    })
  }

  async start() {
    const router = await this.app.container.make('router')

    router
      .group(() => {
        router.get('/', [LogsViewerController, 'index'])
        router.get('/assets/*', [LogsViewerController, 'asset'])
      })
      .prefix('/logs')

    router
      .group(() => {
        router.get('files', [LogsApiController, 'files'])
        router.get('open', [LogsApiController, 'open'])
        router.get('chunk', [LogsApiController, 'chunk'])
        router.get('count', [LogsApiController, 'count'])
      })
      .prefix('/api/v1/logs')
  }
}
