import compiler from '../src/compiler/compiler'
import webpack from "webpack";
import { IFs } from "memfs";
import path from 'path'

describe("gql loader", () => {
    test('transforms GraphQL query to TS module and generating appropriate declaration file using provided schema', async () => {
            return compiler('query.gql', {
                gqlSchemaPath: path.resolve(__dirname, '../fixtures/schema.ts'),
                mutationInterfaceName: 'MutationModel',
                queryInterfaceName: 'QueryModel',
                variablesSuffix: 'ArgModel'
            }).then(([stats, compiler]: [webpack.Stats, webpack.Compiler]) => {
                const output = stats.toJson({source: true});
                expect((compiler.outputFileSystem as unknown as IFs).readFileSync("./fixtures/query.gql.d.ts", "utf-8")).toMatchSnapshot('declaration')
                expect(output.modules[0].source).toMatchSnapshot('output')
            }).catch((errors) =>
                console.error(errors)
            )
        }, 15000
    )
})