import { GraphQLParser } from '../src'

describe('ExtractFromSchema', () => {
  describe('Properly extract', () => {
    const schema = `
      type Author {
        name: String
      }

      type Todo {
        id: String!
        text: String!
        title: String!
        author: Author!
        @AWSLambda(handler: "Controllers/Todo/Author/index.default")
      }

      type Query {
        GetTodo(id: String!): Todo!
        @AWSLambda(handler: "Controllers/Todo/GetTodo.default")
        SearchTodo(search: String!): [Todo!]
        @AWSLambda(handler: "Controllers/Todo/SearchTodo.default")
      }

      schema {
        query: Query
      }
    `

    it('Should print a clean schema', () => {
      const [, clean_schema] = GraphQLParser.ExtractFromSchema(schema)
      expect(clean_schema).toMatchSnapshot()
    })

    it('Should properly fetch fields', () => {
      const [config] = GraphQLParser.ExtractFromSchema(schema)
      expect(config).toHaveLength(3)
      expect(config).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            parent: 'Todo',
            name: 'Todo_author',
            handler: 'Controllers/Todo/Author/index.default',
          }),
          expect.objectContaining({
            parent: 'Query',
            name: 'Query_GetTodo',
            handler: 'Controllers/Todo/GetTodo.default',
          }),
          expect.objectContaining({
            parent: 'Query',
            name: 'Query_SearchTodo',
            handler: 'Controllers/Todo/SearchTodo.default',
          }),
        ])
      )
    })
  })

  describe('Required Argument not found', () => {
    const schema = `
      type Author {
        name: String
      }

      type Todo {
        id: String!
        text: String!
        title: String!
        author: Author!
        @AWSLambda(handlr: "Controllers/Todo/Author/index.default")
      }

      type Query {
        GetTodo(id: String!): Todo!
        @AWSLambda(handler: "Controllers/Todo/GetTodo.default")
        SearchTodo(search: String!): [Todo!]
        @AWSLambda(handler: "Controllers/Todo/SearchTodo.default")
      }

      schema {
        query: Query
      }
    `

    it('Should fail with a proper "missing handler" error.', () => {
      expect(() => GraphQLParser.ExtractFromSchema(schema)).toThrowError(
        '[author > AWSLambda]: is missing required argument (handler).'
      )
    })
  })

  describe('Incorrect Argument type', () => {
    const schema = `
      type Author {
        name: String
      }

      type Todo {
        id: String!
        text: String!
        title: String!
        author: Author!
        @AWSLambda(handler: "Controllers/Todo/Author/index.default")
      }

      type Query {
        GetTodo(id: String!): Todo!
        @AWSLambda(handler: 3)
        SearchTodo(search: String!): [Todo!]
        @AWSLambda(handler: "Controllers/Todo/SearchTodo.default")
      }

      schema {
        query: Query
      }
    `

    it('Should fail with a proper "incorrect type" error.', () => {
      expect(() => GraphQLParser.ExtractFromSchema(schema)).toThrowError(
        '[GetTodo > AWSLambda]: Argument handler expected to be of type String but received Int instead.'
      )
    })
  })
})
