/** Host-app runtime resolved from the IoC container (avoids duplicate `@adonisjs/core` with `file:` installs). */
export class LogViewerRuntime {
  constructor(
    public readonly logsDirectory: string,
    public readonly inProduction: boolean
  ) {}
}
