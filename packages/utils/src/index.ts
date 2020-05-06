import {
  parse,
  print,
  visit,
  Source,
  FieldDefinitionNode,
  DirectiveNode,
  StringValueNode,
  NameNode,
  IntValueNode,
  FloatValueNode,
  BooleanValueNode,
  EnumValueNode,
} from 'graphql'

export type PrimitiveValueNode =
  | IntValueNode
  | FloatValueNode
  | StringValueNode
  | BooleanValueNode
  | EnumValueNode

type SchemaDefinitions = {
  name: string
  field: string
  parent: string
  handler: string
}

interface NamableNode {
  name: NameNode
}

class Utils {
  static LocalizedError<Node extends NamableNode>(
    node: Node | Array<Node>,
    message: string
  ) {
    if (Array.isArray(node)) {
      const name = node.reduce((msg, _) => {
        if (!_?.name?.value) return msg
        return msg.length ? [msg, _.name.value].join(' > ') : _.name.value
      }, '')

      return new Error(name ? `[${name}]: ${message}` : message)
    }

    const name = (node as Node)?.name?.value
    return new Error(name ? `[${name}]: ${message}` : message)
  }

  static LocalizedFieldError(
    directive: DirectiveNode,
    field: FieldDefinitionNode,
    message: string
  ) {
    return Utils.LocalizedError([field, directive], message)
  }

  static GetArgument<Type extends PrimitiveValueNode>(
    directive: DirectiveNode,
    field: FieldDefinitionNode,
    name: string,
    type: Type['kind'],
    required?: boolean
  ): Type['value'] | null {
    if (directive.arguments) {
      const argument = directive.arguments.find((_) => _.name.value === name)
      // Check if required
      if (!argument && required) {
        throw Utils.LocalizedFieldError(
          directive,
          field,
          `is missing required argument (${name}).`
        )
      }

      if (argument && argument.value) {
        const arg_type = argument.value.kind
        const arg_value = (argument.value as Type).value

        if (type && type !== arg_type) {
          const exp_t = type.replace('Value', '')
          const rcv_t = arg_type.replace('Value', '')

          throw Utils.LocalizedFieldError(
            directive,
            field,
            `Argument ${name} expected to be of type ${exp_t} but received ${rcv_t} instead.`
          )
        }

        return arg_value
      }

      return null
    }

    throw Utils.LocalizedFieldError(directive, field, 'Has no arguments.')
  }

  static GetDirective(node: FieldDefinitionNode, name: string) {
    if (node && node.directives) {
      return node.directives.find((d) => d.name.value === name)
    }

    return undefined
  }
}

export class GraphQLParser {
  static ExtractFromSchema(
    schema: string | Source
  ): [Array<SchemaDefinitions>, string] {
    const deleted: Array<string> = []
    const definitions: Array<SchemaDefinitions> = []
    const ast = visit(parse(schema), {
      FieldDefinition: {
        enter(node, key, parent, path, ancestors) {
          const d = Utils.GetDirective(node, 'AWSLambda')
          if (d) {
            const field = node.name.value
            const parent = (ancestors[2] as FieldDefinitionNode).name.value
            const name = [parent, field].join('_')
            const handler = Utils.GetArgument<StringValueNode>(
              d,
              node,
              'handler',
              'StringValue',
              true
            )

            handler && definitions.push({ parent, name, handler, field })

            return {
              ...node,
              // Delete @AWSLambda from the directives list
              directives: node.directives?.filter(
                (_) => _.name.value !== 'AWSLambda'
              ),
            }
          }

          return null
        },
      },
    })

    return [
      definitions,
      print(
        visit(ast, {
          ObjectTypeDefinition: {
            enter(node) {
              if (!node?.fields?.length && deleted.includes(node.name.value)) {
                return null
              }

              return false
            },
          },
        })
      ),
    ]
  }
}
