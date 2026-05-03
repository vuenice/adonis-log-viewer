const LogsViewerController = () => import('../controllers/logs_viewer_controller.js')
const LogsApiController = () => import('../controllers/logs_api_controller.js')

/**
 * Resolver uses `Application#container.make('router')` instead of `@adonisjs/core/services/router`
 * so installs via `npm install ../path` (symlink) do not load a second copy of `@adonisjs/core`.
 */
export default class VueNiceLogsProvider {
  constructor(private app: unknown) {}

  async start() {
    const router = await (this.app as { container: { make(binding: string): Promise<any> } }).container.make('router')

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
