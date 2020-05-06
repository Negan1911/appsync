/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs')
const path = require('path')
const glue = require('schemaglue')
const { GraphQLParser } = require('@appsync/utils')
const AppSync = require('serverless-appsync-plugin')
const templates = path.join(require.resolve('@appsync/utils'), '..', '..')

function ProcessSchema(servicePath, appsync) {
  // Target of where the final schema (without special directive) will be.
  const schemapath = path.join(servicePath, '.serverless_schema.graphql')
  let raw_schema = null
  // Validates schemaDir input
  if (appsync.schemaDir) {
    // Base from where get the .graphql files.
    const basepath = path.join(servicePath, appsync.schemaDir)
    raw_schema = glue(basepath, { ignore: '**/!(*.graphql)' }).schema
  } else if (appsync.schema) {
    // Base from where get the .graphql files.
    raw_schema = fs.readFileSync(
      path.join(servicePath, appsync.schemaDir),
      'utf8'
    )
  } else
    throw new Error(
      'Invalid configuration: neither "schemaDir" nor "schema" config was found'
    )

  // Processed
  const [values, schema] = GraphQLParser.ExtractFromSchema(raw_schema)
  fs.writeFileSync(schemapath, schema, 'utf-8')

  return values
}

module.exports = class LambdaGraphQLPlugin extends AppSync {
  constructor(serverless, options) {
    const serviceRole = options.serviceRole || 'AppSyncServiceRole'
    const functions = serverless.service.functions
    const entries = ProcessSchema(
      serverless.config.servicePath,
      serverless.service.custom.appSync
    )

    serverless.service.functions = {
      ...functions,
      ...entries.reduce((all, _) => {
        return { ...all, [_.name]: { name: _.name, handler: _.handler } }
      }, {}),
    }

    serverless.service.custom.appSync = {
      ...serverless.service.custom.appSync,
      schema: '.serverless_schema.graphql',
      dataSources: [
        ...(serverless.service.custom.appSync.dataSources || []),
        ...entries.map((_) => ({
          name: _.name,
          type: 'AWS_LAMBDA',
          config: {
            functionName: _.name,
            serviceRoleArn: { 'Fn::GetAtt': [serviceRole, 'Arn'] },
          },
        })),
      ],
      mappingTemplates: [
        ...(serverless.service.custom.appSync.mappingTemplates || []),
        ...entries.map((_) => ({
          dataSource: _.name,
          type: _.parent,
          field: _.field,
          request: path.join(templates, 'request.vtl')
          response: path.join(templates, 'response.vtl')
        })),
      ],
    }

    super(serverless, options)

    this.commands = {
      ...this.commands,
      validate: {
        usage: 'Validate your GraphQL Schema',
        lifecycleEvents: ['validate'],
      },
      'generate-types': {
        usage: 'Generate output GraphQL Schema',
        lifecycleEvents: ['gentype'],
      },
    }

    this.hooks = {
      ...this.hooks,
      'validate:validate': () => this.validateSchemas(),
      'gentype:gentype': () => {
        ProcessSchema(
          this.serverless.config.servicePath,
          this.serverless.service.custom.appSync
        )
      },
    }
  }
}
