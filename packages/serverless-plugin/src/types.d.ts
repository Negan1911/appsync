declare module 'serverless-appsync-plugin' {
  import Serverless from 'serverless'
  import Plugin from 'serverless/classes/Plugin'
  class AppSync implements Plugin {
    hooks: Plugin['hooks']
    commands: Plugin['commands']
    serverless: Serverless
    validateSchemas: () => void
    constructor(serverless: Serverless, options: Serverless.Options)
  }

  export = AppSync
}

declare module 'schemaglue' {
  const options: { ignore: string }
  const res: { schema: string }
  const _default: (path: string, opt: typeof options) => typeof res
  export = _default
}
