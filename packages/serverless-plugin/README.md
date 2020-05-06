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
      schemaDir: Controllers/ # Directory to find out the .graphql schemas (Schema stitching), this overrides "schema" field.
      authenticationType: API_KEY #See serverless-appsync-plugin documentation.
      name: ${self:service.name}_${self:provider.stage} #See serverless-appsync-plugin documentation.
      request: 'request.vtl' #See 'mappingTemplates.request' serverless-appsync-plugin documentation.
      response: 'response.vtl' #See 'mappingTemplates.response' serverless-appsync-plugin documentation.
      serviceRole: 'AppSyncServiceRole' #See 'dataSources.config.serviceRoleArn' serverless-appsync-plugin documentation.
```

**Create your first function**:
Create any `.graphql` file under `schemaDir` directory like this:

```graphql
  type Query {
    GetPost(id: ID): Post
    @AWSLambda(handler: "Controllers/Post/GetPost")
  }

  schema {
    query: Query
  }
```

Replace schema and types accordingly, "handler" should point to the function you want to bind
to this lambda.


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
# It can be used on a root field: 
type Query {
  GetPost(id: ID!): Post
  @AWSLambda(handler: "Controllers/Posts/GetPost.default")
}

# Or within another type:
type Post {
  name: String
  text: String
  CreatedBy: User
  @AWSLambda(handler: "Helpers/CreatedBy.default")
}
```

## Parameters:
 - `handler`: Handler receives a string with the path of where the function is
    located, if is part of several exports, use dot notitation to define which
    exported method should be called.