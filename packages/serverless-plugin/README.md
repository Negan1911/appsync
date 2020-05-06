# Lambda GraphQL Plugin
This plugin wraps AppSync and serverless-appsync-plugin into a new format
which requires less configurations.

## How does it works?
This plugin will extract Function, Data Sources and Mapping Definitions using a custom
GraphQL Directive, just flag any GraphQL field with `@AWSLambda()` and it will be deployed.

## How to setup:

**Install the plugin using NPM:**
```sh
npm install --save-dev @appsync/serverless-plugin
```

Or Yarn:
```sh
yarn add --dev @appsync/serverless-plugin
```

**Add it into your `serverless.yml` settings:**
```yml
plugins:
  - '@appsync/serverless-plugin'
```
_Note, if you were using `serverless-appsync-plugin`, remove it, since this plugins wraps it_.

**Set Settings:**
```yml
  custom:
    appSync:
      schema: schema.graphql # If you're not using Schema stitching, you can specify a single graphql file here.
      prefix: 'some_prefix' # If you want to prefix aws lambda names, here you can add a prefix.
      schemaDir: Controllers/ # Directory to find out the .graphql schemas (Schema stitching), this overrides "schema" field.
      authenticationType: API_KEY #See serverless-appsync-plugin documentation.
      name: ${self:service.name}_${self:provider.stage} #See serverless-appsync-plugin documentation.
      serviceRole: 'AppSyncServiceRole' #See 'dataSources.config.serviceRoleArn' serverless-appsync-plugin documentation.
```

**Create your first function**:
Create any `.graphql` file under `schemaDir` directory like this:

```graphql
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
```

Replace schema and types accordingly, "handler" should point to the function you want to bind
to this lambda.

**Event Shape**:
##### Request Event:
When your lambdas are called, the following request is sent on the lambda's first parameter:
```json
{
    // Arguments Received from the call (see `GetTodo` as example).
    "args": {
      "id": "6w4d3xpnevfrdemm7qmpo375fq"        
    },
    // If this is a query as was within a field, you'll receive his parent value here.
    // (see `author` field as example, on `parent` you'll receive the `Todo`)
    "parent": null,
    // Headers from the request, in a key-value object.
    "headers": {
        "authorization": "Bearer eyJh.......90",
        "sec-fetch-dest": "empty",
        "cloudfront-is-desktop-viewer": "true",
        "sec-fetch-site": "same-origin",
        "x-forwarded-port": "443"
    }
}
```

##### Successful Response:
If everything worked well, you can return data to the client by returning:
```json
{
  // Remember, `data` should match the response type of your graphql field, this
  // is the example of `GetTodo`
  "data": {
    "id": "6w4d3xpnevfrdemm7qmpo375fq",
    "text": "This is your note body, you can put things here",
    "title": "An ordinary note"
  }
}
```

##### Failed Response:
If an error ocurred, we'll format it accordingly if `error` property is returned:
```json
{
  "error": {
    "name": "NotFound",
    "message": "Todo not found",
    "other_field": "any other field that you like to return to the client"
  }
}
```
For proper formatting, please return `name` and `message` on those errors.

## API:

### Commands:
- `serverless validate`: Will Validate your schema/schemas, throwing an error if an issue is found.
- `serverless generate-types`: Will generate an example of the output serverless type.


### Config Overrides:
- `custom.appSync.schema`:
    If `custom.appSync.schemaDir` is found, it will override `custom.appSync.schema`.

### Config Shape:
  Please refer to [Serverless Appsync Plugin](https://github.com/sid88in/serverless-appsync-plugin#configuring-the-plugin) for documentation on original fields.
  Extra fields includes:
  ```yml
    appSync:
      schema: schema.graphql # Reference a single graphql schema field to use as definition.
      schemaDir: Controllers/ # Directory to find out the .graphql schemas using schema stitching. This overrides "schema" field.
      serviceRole: 'AppSyncServiceRole' #See 'dataSources.config.serviceRoleArn' serverless-appsync-plugin documentation.
  ```

  - `schemaDir`: Setting this field the plugin will set schema stitching by picking any `.graphql` file under this directory.
  - `request` / `response`: Points to a [Mapping Template File](https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference.html), see [Configuring the plugin](https://github.com/sid88in/serverless-appsync-plugin#configuring-the-plugin) for more info.
  - `serviceRole`: Where `AppSyncDynamoDBServiceRole` is an IAM role defined in Resources, see "Example ServiceRole"


### Example ServiceRole:
```yml
resources:
  Resources:
    AppSyncServiceRole:
      Type: "AWS::IAM::Role"
      Properties:
        RoleName: ${self:custom.appSync.name}-Lambda-AppSyncServiceRole
        AssumeRolePolicyDocument:
          Version: "2012-10-17"
          Statement:
            - Effect: "Allow"
              Principal:
                Service:
                  - "appsync.amazonaws.com"
              Action:
                - "sts:AssumeRole"

        Policies:
          - PolicyName: ${self:custom.appSync.name}-Lambda-AppSyncServiceRole-Policy
            PolicyDocument:
              Version: "2012-10-17"
              Statement:
                - Effect: "Allow"
                  Action:
                    - "lambda:invokeFunction"
                  Resource:
                    - "*"
```

## The `@AWSLambda` Directive:

### Usage
`@AWSLambda` flags the following field to be resolved with a function:
```gql
# It can be used on a root type: 
type Query {
  GetTodo(id: String!): Todo!
  @AWSLambda(handler: "Controllers/Todo/GetTodo.default")
}

# Or within another type:
type Todo {
  id: String!
  text: String!
  title: String!
  author: Author!
  @AWSLambda(handler: "Controllers/Todo/Author/index.default")
}
```

## Parameters:
 - `handler`: Handler receives a string with the path of where the function is
    located, use dot notation to define which exported method should be called.