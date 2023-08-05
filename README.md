# GraphQL webpack loader 
[![npm version](https://badge.fury.io/js/gql-webpack-loader.svg)](https://badge.fury.io/js/gql-webpack-loader)
[![Build Status](https://travis-ci.com/roman0x58/gql-webpack-loader.svg?branch=master)](https://travis-ci.com/github/roman0x58/gql-webpack-loader)

The GraphQL webpack loader transforms your queries from .gql files into JavaScript modules, along with their corresponding declaration files (.d.ts), utilizing your generated TypeScript GraphQL schema model.
To view the generated result, refer to the test snapshot.

And in your JavaScript:

```js
import GqlQuery from 'query.gql'
```

## Install

```sh
npm install --save-dev gql-webpack-loader
```

or

```sh
yarn add gql-webpack-loader
```

## Webpack configuration

```js
{
    test: /\.(graphql|gql)$/,
    exclude: /node_modules/,
    loader: "gql-webpack-loader",
    options: {
        gqlSchemaPath: path.resolve(__dirname, '../fixtures/schema.ts'),
        declaration: true,    
        mutationInterfaceName: 'MutationModel',
        queryInterfaceName: 'QueryModel',
        variableInterfaceRe: (operationNode) =>
            // This used by default 
            new RegExp(`(${operation.operation}).*(${operation.fieldOperationName}).*argsmodel`, 'gmi')
    }    
}
```
## Config

### 1. declaration 
#### Type: boolean
Whether generate corresponding declaration (d.ts) file for generated module. 

### 2. gqlSchemaPath
#### Type: string
###### Required if `declaration` is true
Path to TypeScript GraphQL schema. You can generate TypeScript schema with the next libraries
 - https://github.com/victorgarciaesgi/simple-graphql-to-typescript
 - https://github.com/dotansimha/graphql-code-generator
                                                                                         
### 3. mutationInterfaceName
#### Type: string
###### Required if `declaration` is true
Name of your mutation model. 

### 4. queryInterfaceName
#### Type: string
###### Required if `declaration` is true
Name of your query model

### 5. variableInterfaceRe 
#### Type: (node: OperationNode) => RegExp
###### Optional
A function that takes an operation node as input and returns a regular expression to validate variable imports. If no variable model is found, { [key: string]: any } will be used.

### 5. exportNameBy 
#### Type: (fileName: string) => string
###### Optional
A function that takes a fileName as input and returns a name for the export clause in both the GraphQL JS module and its declaration.

## Declaration usage
```ts
// you should provide GraphQL execution function & the result type
type Result<T = any> = {
    data?: T;
    errors?: Error[];
}

const execute = <T = any, V = Record<string, any>>(module: GqlModule<T, V>, variables?: V): Promise<Result<V>> => {
  // your graphql query execution implementation
}

// and later in your code
import GqlQuery from 'query.gql'
execute(GqlQuery.operation).then((response) =>
    // response will have a type information about your GraphQl query
    response.data.operation    
)
```
