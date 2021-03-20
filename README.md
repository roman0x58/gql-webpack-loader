# GraphQL webpack loader
[![npm version](https://badge.fury.io/js/gql-webpack-loader.svg)](https://badge.fury.io/js/gql-webpack-loader)
[![Build Status](https://travis-ci.com/roman0x58/gql-webpack-loader.svg?branch=master)](https://travis-ci.com/github/roman0x58/gql-webpack-loader)

The GraphQL webpack loader turns your queries from`.gql` files into TypeScript module with corresponding declaration file(d.ts) using your generated TypeScript graphql schema model. The loader will produce the following output for an imported GraphQL query:
```ts
import { GqlModule } from "gql-webpack-loader";
import { someQueryOperationArgModel } from "./schema.ts";
import { someMutationOperationArgModel } from "./schema.ts";
import { QueryModel } from "./schema.ts";
import { MutationModel } from "./schema.ts";

export default {
    someQueryOperation: {
        query: `query someQueryOperation($id: String) {
      someQueryOperation(id: $id) {
        field1
        field2
        ...Fragment1
      }
    }
    fragment Fragment1 on SomeOperationReturnType {
      field3
    }`,
        operation: "someQueryOperation",
    } as GqlModule<QueryModel["someQueryOperation"], someQueryOperationArgModel>,
    someMutationOperation: {
        query: `mutation someMutationOperation($id: String) {
      someMutationOperation(id: $id) {
        field1
        field2
      }
    }`,
        operation: "someMutationOperation",
    } as GqlModule<MutationModel["someMutationOperation"], someMutationOperationArgModel>,
};
```

And in your JavaScript:

```js
import { ABC } from 'query.gql'
// or
import GqlQuery from 'query.gql'
```

## Install

```sh
npm install --save-dev gql-webpack-loader ts-loader
```

or

```sh
yarn add gql-webpack-loader ts-loader
```

## Webpack configuration
### 1. Gql-webpack-loader configuration

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
### 2. Ts loader configuration
```js
{
    loader: 'ts-loader', 
    options: {
        appendTsSuffixTo: [/\.gql$/]
    }
}
```

## Config

### 1. gqlSchemaPath *
Path to TypeScript GraphQL schema. You can generate TypeScript schema with next libraries
 - https://github.com/victorgarciaesgi/simple-graphql-to-typescript
 - https://github.com/dotansimha/graphql-code-generator
                                                                                         
### 2 .mutationInterfaceName * 
Name of your mutation model

### 3 .queryInterfaceName *
Name of your query model

### 3 .variableInterfaceName (optional)
Function that accepts operation name and returns the operation variable model name. If there's no variable model than `{ [key: string]: any }` will be used   