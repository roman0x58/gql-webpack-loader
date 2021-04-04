import { FragmentDefinitionNode, FragmentSpreadNode, OperationDefinitionNode, parse, print } from 'graphql'
import { SelectionSetNode } from "graphql/language/ast";
import { GqlTypedString } from './src/GqlTypedString'
import { GqlModule } from './src/GqlModule'
import { GqlQuery } from './src/GqlQuery'

import webpack from "webpack"
import { EOL } from 'os'
import fs from 'fs'
import path from 'path'
import loaderUtils from 'loader-utils'
import { LoaderOptions } from "./src/LoaderOptions";
import { stripMargin, capitalize } from "./src/util";

type FragmentSpreads = Array<FragmentSpreadNode>
type OperationNode = OperationDefinitionNode & { operationName: string }
type OperationWithFragments = [OperationNode, FragmentSpreads]
type GeneratedType = string

const lookupFragmentSpreads = (node: SelectionSetNode, acc: Array<FragmentSpreadNode>): Array<FragmentSpreadNode> => {
    return node ? node.selections.reduce((acc, i) => {
        if (i.kind === "FragmentSpread") return acc.concat(i)
        else if (i.selectionSet) return lookupFragmentSpreads(i.selectionSet, acc)
        else return acc
    }, acc) : acc
}
const renderOperationNode = (operation: OperationDefinitionNode, fragments: Array<FragmentDefinitionNode>) =>
    stripMargin`{ 
    |"query": \`${print(operation).concat(fragments.length ? EOL + fragments.map(print).join(EOL) : "")}\`,
    |"operation": "${operation.name.value}" 
    |}`

const renderKeyValue = (fragments: Array<FragmentDefinitionNode>) =>
    ([operation, fragmentNames]: OperationWithFragments) => {
        let frags = fragments.filter((fragment) => fragmentNames.map(i => i.name.value).indexOf(fragment.name.value) !== -1)
        return `"${operation.name.value}": ${renderOperationNode(operation, frags)}`
    }

const renderDTSKeyValue = (genType: (GeneratedType, OperationDefinitionNode) => GeneratedType) =>
    ([[operation, _2], interfaceName, _3]: [OperationWithFragments, GeneratedType, string]) =>
        `"${operation.name.value}": ${genType(interfaceName, operation)}`

const getOptions = (loaderContext: webpack.loader.LoaderContext): LoaderOptions => {
    const options = loaderUtils.getOptions(loaderContext) as unknown as LoaderOptions
    if (!options.variableInterfaceName)
        options.variableInterfaceName = () => null
    return options
}
const generateQueryType = (options: LoaderOptions) => (op: OperationWithFragments): [OperationWithFragments, string, GeneratedType] => {
    const [operation] = op
    const resultTypeInterfaceName = operation.operation === "mutation" ? options.mutationInterfaceName : options.queryInterfaceName;

    const queryInterfaceName = `${capitalize(operation.name.value)}${capitalize(operation.operation)}`
    return [op, queryInterfaceName, stripMargin`
        |export interface ${queryInterfaceName} extends GqlQuery {
        |   "${operation.name.value}"? : ${resultTypeInterfaceName}["${operation.operationName}"]    
        |}`
    ]
}
const generateModuleType = (options: LoaderOptions, variableModels: Array<string>) => (queryInterface: GeneratedType, operation: OperationNode): GeneratedType => {
    return `GqlModule<${queryInterface}, ${variableModels.find(i => i === options.variableInterfaceName(operation.operationName)) || '{ [key: string]: any }'}>`
}

const toAsset = (content) => ({ source: () => content, size: () => content.length})

export default function (source: string) {
    const ctx: webpack.loader.LoaderContext = this
    if (ctx.cacheable) ctx.cacheable()

    const callback: webpack.loader.loaderCallback = ctx.async();
    try {
        const gqlDocumentNode = parse(source)
        const options: LoaderOptions = getOptions(ctx)



        const [operations, fragments]: [Array<OperationWithFragments>, Array<FragmentDefinitionNode>] =
            gqlDocumentNode.definitions.reduce(([operations, fragments], operation) => {
                if (operation.kind === "OperationDefinition") {
                    const headSelection = operation.selectionSet.selections[0];
                    (operation as OperationNode).operationName = headSelection?.kind === "Field" ? headSelection.name.value : operation.name.value
                    operations.push([operation as OperationNode, lookupFragmentSpreads(operation.selectionSet, [])])
                    return [operations, fragments]
                } else if (operation.kind === "FragmentDefinition")
                    return [operations, fragments.concat(operation)]

                return [operations, fragments]
            }, [[], []])



        if(options.declaration) {
            const gqlSchemaRequest = loaderUtils.stringifyRequest(ctx, options.gqlSchemaPath)
            const gqlSchemaTsInterfaces = fs.readFileSync(options.gqlSchemaPath, 'utf-8')

            const mutationInterfaceImport = () => {
                if (gqlSchemaTsInterfaces.indexOf(options.mutationInterfaceName) == -1) {
                    throw new Error(`Mutation interface not found for name ${options.mutationInterfaceName} in schema located by path ${gqlSchemaRequest}.`)
                } else return options.mutationInterfaceName
            }

            const queryInterfaceImport = () => {
                if (gqlSchemaTsInterfaces.indexOf(options.queryInterfaceName) == -1) {
                    throw new Error(`Query interface not found for name ${options.queryInterfaceName} in schema located by path ${gqlSchemaRequest}.`)
                } else return options.queryInterfaceName
            }

            const validVariableNames = operations
                .filter(([operation, f]) => gqlSchemaTsInterfaces.indexOf(options.variableInterfaceName(operation.operationName)) !== -1)
                .map(([op, f]) => options.variableInterfaceName(op.operationName))

            const importNames = [...new Set(validVariableNames.concat([queryInterfaceImport(), mutationInterfaceImport()]))]
            const imports = stripMargin`
            |import type { GqlModule, GqlQuery } from 'gql-webpack-loader';
            |import type { ${importNames.join(', ')} } from ${gqlSchemaRequest};`

            const queryInterfaces = operations.map(generateQueryType(options))

            const dtsLocation = (filename: string) => {
                const baseName = path.basename(filename);
                const dirName = path.dirname(filename);
                return path.resolve(ctx.context, path.join(dirName, `${baseName}.d.ts`));
            }

            const dtsAssetLocation = dtsLocation(ctx.resourcePath)
            const dtsAssetOutput = stripMargin`
            |${imports}
            |
            |${queryInterfaces.map(([_1, _2, tp]) => tp).join(EOL)}
            |
            |declare const _default: {
            |\t${queryInterfaces.map(renderDTSKeyValue(generateModuleType(options, validVariableNames))).join(';' + EOL + '\t')}
            |};
            |
            |export default _default;`

            const compilation = ctx._compilation

            compilation.hooks.additionalAssets.tapAsync('gql-webpack-loader', (callback) => {
                const assetPath = path.relative(compilation.compiler.outputPath, dtsAssetLocation)
                compilation.assets[assetPath] = toAsset(dtsAssetOutput)
                callback()
            })
            if(options.debug)  console.debug('dtsOutput\n', dtsAssetOutput)
        }

        const jsOutput = stripMargin`
            |export default { 
            |\t${operations.map(renderKeyValue(fragments)).join(',' + EOL + '\t')}
            |}`
        if(options.debug) console.debug('jsOutput\n', jsOutput)
        return callback(null, jsOutput)
    } catch (error) {
        return callback(error)
    }
};

export { GqlTypedString, GqlModule, GqlQuery }