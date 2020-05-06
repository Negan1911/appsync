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
  /**
   * Returns an understandable error and a way to found on which node happened.
   * @internal
   * @param node Node where the error happened, will be formatted on the error.
   * @param message Description of the error.
   * @returns Formatted error.
   */
  static LocalizedError<Node extends NamableNode>(
    node: Node | Array<Node>,
    message: string
  ): Error {
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

  /**
   * Returns an understandable error and a way to found on which node happened.
   * @internal
   * @param directive Directive node where the error happened.
   * @param field Field node where the error happened.
   * @param message description of the error.
   * @returns Formatted error.
   */
  static LocalizedFieldError(
    directive: DirectiveNode,
    field: FieldDefinitionNode,
    message: string
  ) {
    return Utils.LocalizedError([field, directive], message)
  }

  /**
   * Returns a directive argument value.
   * @internal
   * @template Type Type of the argument value.
   * @param directive Directive where the value belongs.
   * @param field Field where the directive belongs.
   * @param name Name of the argument to look for.
   * @param type Type of the argument value, validates against `Type`.
   * @param required If required, fails if not found.
   * @returns Argument type or null if not found (and not required).
   */
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

  /**
   * Returns a specific directive from a field.
   * @internal
   * @param field Field where the directive belongs.
   * @param name Name of the directive to look for.
   * @returns Directive Node or undefined if not found
   */
  static GetDirective(field: FieldDefinitionNode, name: string) {
    if (field && field.directives) {
      return field.directives.find((d) => d.name.value === name)
    }

    return undefined
  }
}

export class GraphQLParser {
  /**
   * Extract definitions from a schema, and returns a useable schema.
   * @param schema Schema as string
   * @returns Tuple, first parameter a list of definitions taken from `@AWSLambda` directives, 2nd parameter is a clean schema
   */
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
