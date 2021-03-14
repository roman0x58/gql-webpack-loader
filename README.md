# Naive GraphQL webpack loader
[![npm version](https://badge.fury.io/js/gql-loader-webpack.svg)](https://badge.fury.io/js/gql-loader-webpack)

GraphQL string loader turns your queries from`.gql` files into es6 module. The loader will produce the next result for an imported query:
```js
    export default { 
        "ABC": {
            query: `query ABC {
                A
                ...C
            }
            fragment C on ABC {
                Y
            }`,
            operation: "ABC" 
        } 
    }
```

And in your JavaScript:

```js
 import { ABC } from 'query.gql'
 // or
 import GqlQuery from 'query.gql'
```

## Install

```
npm install --save-dev gql-loader-webpack
```

or

```
yarn add gql-loader-webpack
```

## Webpack configuration

```js
{
    test: /\.(graphql|gql)$/,
    exclude: /node_modules/,
    loader: 'gql'
}
```