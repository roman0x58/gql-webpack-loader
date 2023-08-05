import compiler from '../src/compiler/compiler'
import webpack from "webpack";
import { IFs } from "memfs";
import path from 'path'
import { capitalize } from "../src/util";

describe("gql loader", () => {
    test('transforms GraphQL query to ES6 module and generates appropriate declaration file using provided schema', async () => {
            return compiler('query.gql', {
                gqlSchemaPath: path.resolve(__dirname, '../fixtures/schema.ts'),
                declaration: true,
                mutationInterfaceName: 'MutationModel',
                queryInterfaceName: 'QueryModel',
                debug: true
            }).then(([stats, compiler]: [webpack.Stats, webpack.Compiler]) => {
                const output = stats.toJson({ source: true });
                expect((compiler.outputFileSystem as unknown as IFs).readFileSync("./fixtures/query.gql.d.ts", "utf-8")).toMatchSnapshot('declaration')
                expect(output.modules[0].source).toMatchSnapshot('output')

            }).catch((errors) =>
                console.error(errors)
            )
        }, 15000
    )
    test('transforms GraphQL query to ES6 module without variable interface name configuration', async () => {
            return compiler('query.gql', {
                gqlSchemaPath: path.resolve(__dirname, '../fixtures/schema.ts'),
                declaration: true,
                mutationInterfaceName: 'MutationModel',
                queryInterfaceName: 'QueryModel',
                debug: true
            }).then(([stats, compiler]: [webpack.Stats, webpack.Compiler]) => {
                const output = stats.toJson({ source: true });
                expect((compiler.outputFileSystem as unknown as IFs).readFileSync("./fixtures/query.gql.d.ts", "utf-8")).toMatchSnapshot('declaration')
                expect(output.modules[0].source).toMatchSnapshot('output')
            }).catch((errors) =>
                console.error(errors)
            )
        }, 15000
    )
    test('transforms GraphQL query to ES6 module with named import', async () => {
            return compiler('query.gql', {
                gqlSchemaPath: path.resolve(__dirname, '../fixtures/schema.ts'),
                declaration: true,
                mutationInterfaceName: 'MutationModel',
                queryInterfaceName: 'QueryModel',
                exportNameBy: (fileName) => capitalize(fileName) + 'Gql',
                debug: true
            }).then(([stats, compiler]: [webpack.Stats, webpack.Compiler]) => {
                const output = stats.toJson({ source: true });
                expect((compiler.outputFileSystem as unknown as IFs).readFileSync("./fixtures/query.gql.d.ts", "utf-8")).toMatchSnapshot('declaration')
                expect(output.modules[0].source).toMatchSnapshot('named-import')
            }).catch((errors) =>
                console.error(errors)
            )
        }, 15000
    )
    test('transforms GraphQL query to ES6 module without declaration', async () => {
            return compiler('query.gql', {
                debug: true
            }).then(([stats]: [webpack.Stats, webpack.Compiler]) => {
                const output = stats.toJson({ source: true });
                expect(output.modules[0].source).toMatchSnapshot('output')
            }).catch((errors) =>
                console.error(errors)
            )
        }, 15000
    )
})