# GraphQL webpack loader 
[![npm version](https://badge.fury.io/js/gql-webpack-loader.svg)](https://badge.fury.io/js/gql-webpack-loader)
[![Build Status](https://travis-ci.com/roman0x58/gql-webpack-loader.svg?branch=master)](https://travis-ci.com/github/roman0x58/gql-webpack-loader)

The GraphQL webpack loader turns your queries from`.gql` files into JS module with corresponding declaration file(d.ts) using your generated TypeScript graphql schema model. The loader will produce the following output for an imported GraphQL query:
```js
export default {
    "queryOperationName1": {
        "query": `query queryOperationName1($id: String) {
      someQueryOperation(id: $id) {
        field1
        field2
        ...Fragment1
      }
    }
    fragment Fragment1 on SomeOperationReturnType {
      field3
    }`,
        "operation": "queryOperationName1"
    },
    "queryOperationName2": {
        "query": `query queryOperationName2($id: String) {
      someQueryOperation(id: $id) {
        field1
      }
    }`,
        "operation": "queryOperationName2"
    },
    "mutationOperationName": {
        "query": `mutation mutationOperationName($id: String) {
      someMutationOperation(id: $id) {
        field1
        field2
      }
    }`,
        "operation": "mutationOperationName"
    }
}
```
Generated .d.ts 
```ts
import type { GqlModule, GqlQuery } from 'gql-webpack-loader';
import type { someQueryOperationArgModel, someMutationOperationArgModel, QueryModel, MutationModel } from "./schema.ts";

export interface QueryOperationName1Query extends GqlQuery {
    "queryOperationName1"? : QueryModel["someQueryOperation"]
}
export interface QueryOperationName2Query extends GqlQuery {
    "queryOperationName2"? : QueryModel["someQueryOperation"]
}
export interface MutationOperationNameMutation extends GqlQuery {
    "mutationOperationName"? : MutationModel["someMutationOperation"]
}

declare const _default: {
    "queryOperationName1": GqlModule<QueryOperationName1Query, someQueryOperationArgModel>;
    "queryOperationName2": GqlModule<QueryOperationName2Query, someQueryOperationArgModel>;
    "mutationOperationName": GqlModule<MutationOperationNameMutation, someMutationOperationArgModel>
};

export default _default;

``` 

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
yarn add gql-webpack-loadel
```

## Webpack configuration

```js
{
    test: /\.(graphql|gql)$/,
    exclude: /node_modules/,
    loader: "gql-webpack-loader",
    options: {
        gqlSchemaPath: path.resolve(__dirname, '../fixtures/schema.ts'),
        mutationInterfaceName: 'MutationModel',
        queryInterfaceName: 'QueryModel',
        variableInterfaceName: (operationName) => operationName + 'ArgModel'    
    }    
}
```
## Config

### 1. gqlSchemaPath *
Path to TypeScript GraphQL schema. You can generate TypeScript schema with next libraries
 - https://github.com/victorgarciaesgi/simple-graphql-to-typescript
 - https://github.com/dotansimha/graphql-code-generator
                                                                                         
### 2. mutationInterfaceName * 
Name of your mutation model

### 3. queryInterfaceName *
Name of your query model

### 4. variableInterfaceName (optional)
Function that accepts operation name and returns the operation variable model name. If there's no variable model than `{ [key: string]: any }` will be used   

## Usage
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
