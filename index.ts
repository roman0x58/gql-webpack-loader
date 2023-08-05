import { FragmentDefinitionNode, FragmentSpreadNode, Kind, OperationDefinitionNode, parse, print } from 'graphql'
import { FieldNode, SelectionSetNode } from "graphql/language/ast";
import { GqlTypedString } from './src/GqlTypedString'
import { GqlModule } from './src/GqlModule'
import { GqlQuery } from './src/GqlQuery'

import webpack from "webpack"
import { EOL } from 'os'
import fs from 'fs'
import path from 'path'
import loaderUtils from 'loader-utils'
import { LoaderOptions } from "./src/LoaderOptions";
import { capitalize, dedupe, isValidVariable, stripMargin } from "./src/util";
import { RawSource } from "webpack-sources";

type FragmentSpreads = Array<FragmentSpreadNode>
export type OperationNode = OperationDefinitionNode & { fieldOperationName: string, variableArgsInterfaces: string[] }
type OperationWithFragments = [OperationNode, FragmentSpreadNode[]]
type GeneratedType = string
type PreparedDoc = [Array<OperationWithFragments>, Array<FragmentDefinitionNode>]

const traverse = (node: SelectionSetNode, acc: [FragmentSpreadNode[], FieldNode[]]): [FragmentSpreadNode[], FieldNode[]] => {
    return node ? node.selections.reduce(([fragments, fields], i) => {
        if (i.kind === Kind.FRAGMENT_SPREAD) return [fragments.concat(i), fields]
        else if (i.kind === Kind.FIELD && i.arguments.length > 0)
            return (i.selectionSet) ? traverse(i.selectionSet, [fragments, fields.concat(i)]) : [fragments, fields.concat(i)]
        else if (i.selectionSet) return traverse(i.selectionSet, [fragments, fields])
        else return [fragments, fields]
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

const renderDTSKeyValue = (genType: ReturnType<typeof generateModuleType>) =>
    ([[operation, _2], interfaceName, _3]: [OperationWithFragments, GeneratedType, string]) =>
        `"${operation.name.value}": ${genType(interfaceName, operation)}`

const getOptions = (loaderContext: webpack.loader.LoaderContext): LoaderOptions => {
    const options = loaderUtils.getOptions(loaderContext) as unknown as LoaderOptions
    if (!options.variableInterfaceRe)
        options.variableInterfaceRe = (operation: OperationNode, fieldName = "") => {
            return new RegExp(`(${operation.operation})(${fieldName + operation.fieldOperationName})argsmodel`, 'gmi')
        }
    return options
}
const generateQueryType = (options: LoaderOptions) => (op: OperationWithFragments): [OperationWithFragments, string, GeneratedType] => {
    const [operation] = op
    const resultTypeInterfaceName = operation.operation === "mutation" ? options.mutationInterfaceName : options.queryInterfaceName;

    const queryInterfaceName = `${capitalize(operation.name.value)}${capitalize(operation.operation)}`
    return [op, queryInterfaceName, stripMargin`
        |export interface ${queryInterfaceName} extends GqlQuery {
        |   "${operation.fieldOperationName}"? : ${resultTypeInterfaceName}["${operation.fieldOperationName}"]    
        |}`
    ]
}

const generateModuleType = (options: LoaderOptions) => (queryInterface: GeneratedType, operation: OperationNode): GeneratedType => {
    // console.log('generate by operation', JSON.stringify(operation.selectionSet, null, 4))
    // const fieldNods = fields.flatMap(i => i.name.value === operation.fieldOperationName ? [] : [i])
    return `GqlModule<${queryInterface}, ${operation.variableArgsInterfaces.join(' & ') || '{ [key: string]: any }'}>`
}
const toAsset: (content: string) => RawSource = (content) => new RawSource(content)
const generateJsOutput  = (options: LoaderOptions, [operations, fragments]: PreparedDoc, importName: string) : string => {
    const definition = operations.map(renderKeyValue(fragments)).join(',' + EOL + '\t')
    const jsOutput = options.exportNameBy ? stripMargin`
            |export const ${importName} = {
            |\t${definition}  
            |};
            |export default ${importName};` : stripMargin`
            |export default {
            |\t${definition}
            |}`

    if (options.debug) console.debug('jsOutput\n', jsOutput)
    return jsOutput
}
type ReadSchemaFileFn = {
    (options: LoaderOptions): string;
    schema?: string;
};
const readSchemaFile : ReadSchemaFileFn = (options: LoaderOptions) => {
    if (!readSchemaFile.schema)
        readSchemaFile.schema = fs.readFileSync(options.gqlSchemaPath, 'utf-8')
    return readSchemaFile.schema
}

export default async function (source: string) {
    const ctx: webpack.loader.LoaderContext = this
    if (ctx.cacheable) ctx.cacheable()

    const callback: webpack.loader.loaderCallback = ctx.async();
    try {
        const gqlDocumentNode = parse(source)
        const options: LoaderOptions = getOptions(ctx)

        const prepareDocument: (gqlSchemaTsInterfaces?: string) => [Array<OperationWithFragments>, Array<FragmentDefinitionNode>] = (gqlSchemaTsInterfaces) =>
            gqlDocumentNode.definitions.reduce(([operations, fragments], operation) => {
                if (operation.kind === "OperationDefinition") {
                    const headSelection = operation.selectionSet.selections[0];
                    const operationNode = (operation as OperationNode)
                    operationNode.fieldOperationName = headSelection?.kind === "Field" ? headSelection.name.value : operation.name.value
                    const [frags, fields] = traverse(operation.selectionSet, [[], []])
                    if (gqlSchemaTsInterfaces) {
                        operationNode.variableArgsInterfaces = fields.flatMap(x =>
                            gqlSchemaTsInterfaces.match(options.variableInterfaceRe(operationNode, x.name.value)) || [])
                            .concat(gqlSchemaTsInterfaces.match(options.variableInterfaceRe(operationNode)) || [])
                    } else operationNode.variableArgsInterfaces = []
                    operations.push([operationNode, frags])
                    return [operations, fragments]
                } else if (operation.kind === "FragmentDefinition")
                    return [operations, fragments.concat(operation)]

                return [operations, fragments]
            }, [[], []])

        const gqlBaseName = path.basename(ctx.resourcePath);
        const gqlDirName = path.dirname(ctx.resourcePath);
        const importName = options.exportNameBy?.(path.basename(ctx.resourcePath, '.gql')) || `_default`

        if (!isValidVariable(importName)) {
            throw new Error(`Invalid import name ${importName}. Please check loader 'importNameBy' function`)
        }

        if (options.declaration) {
            const gqlSchemaRequest = loaderUtils.stringifyRequest(ctx, options.gqlSchemaPath)
            const gqlSchemaTsInterfaces = readSchemaFile(options)
            const [operations, fragments] = prepareDocument(gqlSchemaTsInterfaces)
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

            const validVariableNames = dedupe(operations.flatMap(([x]) => x.variableArgsInterfaces))

            const importNames = dedupe(validVariableNames.concat([queryInterfaceImport(), mutationInterfaceImport()]))
            const imports = stripMargin`
                |import type { GqlModule, GqlQuery } from 'gql-webpack-loader';
                |import type { ${importNames.join(', ')} } from ${gqlSchemaRequest};`

            const queryInterfaces = operations.map(generateQueryType(options))

            const dtsAssetLocation = path.resolve(ctx.context, path.join(gqlDirName, `${gqlBaseName}.d.ts`))
            const dtsAssetOutput = stripMargin`
                |${imports}
                |
                |${queryInterfaces.map(([_1, _2, tp]) => tp).join(EOL)}
                |
                |export declare const ${importName}: {
                |\t${queryInterfaces.map(renderDTSKeyValue(generateModuleType(options))).join(';' + EOL + '\t')}
                |};
                |
                |export default ${importName};`

            const compilation = ctx._compilation

            compilation.hooks.additionalAssets.tapAsync('gql-webpack-loader', (callback) => {
                const assetPath = path.relative(compilation.compiler.outputPath, dtsAssetLocation)
                compilation.assets[assetPath] = toAsset(dtsAssetOutput)
                callback()
            })
            if (options.debug) console.debug('dtsOutput\n', dtsAssetOutput)
            return callback(null, generateJsOutput(options, [operations, fragments], importName))
        } else {
            return callback(null, generateJsOutput(options, prepareDocument(), importName))
        }

    } catch (error) {
        return callback(error)
    }
};

export { GqlTypedString, GqlModule, GqlQuery }