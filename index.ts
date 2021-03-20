import { FragmentDefinitionNode, OperationDefinitionNode, parse, print } from 'graphql'
import { SelectionSetNode } from "graphql/language/ast";
import { GqlQuery } from './src/GqlQuery'
import { GqlModule } from './src/GqlModule'
import webpack from "webpack"
import { EOL } from 'os'
import fs from 'fs'
import loaderUtils from 'loader-utils'
import { LoaderOptions } from "./src/LoaderOptions";

type FragmentNames = Array<string>
type Operation = [OperationDefinitionNode, FragmentNames]
type GeneratedType = string

const lookupFragments = (node: SelectionSetNode, acc: Array<string>): Array<string> => {
    return node ? node.selections.reduce((acc, i) => {
        if (i.kind === "FragmentSpread") return acc.concat(i.name.value)
        else if (i.selectionSet) return lookupFragments(i.selectionSet, acc)
        else return acc
    }, acc) : acc
}
const renderOperationNode = (operation: OperationDefinitionNode, fragments: Array<FragmentDefinitionNode>) =>
    `{ 
                query: \`${print(operation).concat(fragments.length ? EOL + fragments.map(print).join(EOL) : "")}\`,
                operation: "${operation.name.value}" 
     }`

const renderKeyValue = (fragments: Array<FragmentDefinitionNode>, genType: (OperationDefinitionNode) => GeneratedType) =>
    ([operation, fragmentNames]: Operation) => {
        let frags = fragments.filter((fragment) => fragmentNames.indexOf(fragment.name.value) !== -1)
        return `"${operation.name.value}": ${renderOperationNode(operation, frags)} as ${genType(operation)}`
    }

const getOptions = (loaderContext: webpack.loader.LoaderContext): LoaderOptions => {
    const options = loaderUtils.getOptions(loaderContext) as unknown as LoaderOptions
    if(!options.variableInterfaceName)
        options.variableInterfaceName = () => null
    return options
}
const generateInterface = (options: LoaderOptions, variableModels: Array<string>) => (operation: OperationDefinitionNode) : GeneratedType => {
    const interfaceName = operation.operation === "mutation" ? options.mutationInterfaceName : options.queryInterfaceName;
    return `GqlModule<${interfaceName}['${operation.name.value}'], ${variableModels.find(i => i === options.variableInterfaceName(operation.name.value)) || '`{ [key: string]: any }`'}>`
}

export default <webpack.loader.Loader>function (source: string) {
    const ctx: webpack.loader.LoaderContext = this
    
    const gqlDocumentNode = parse(source)
    const options: LoaderOptions = getOptions(ctx)

    const gqlSchemaRequest = loaderUtils.stringifyRequest(ctx, options.gqlSchemaPath)
    const gqlSchemaTsInterfaces = fs.readFileSync(options.gqlSchemaPath, 'utf-8')

    const [operations, fragments]: [Array<Operation>, Array<FragmentDefinitionNode>] =
        gqlDocumentNode.definitions.reduce(([operations, fragments], operation) => {
            if (operation.kind === "OperationDefinition") {
                operations.push([operation, lookupFragments(operation.selectionSet, [])])
                return [operations, fragments]
            } else if (operation.kind === "FragmentDefinition")
                return [operations, fragments.concat(operation)]

            return [operations, fragments]
        }, [[], []])


    const mutationInterfaceImport = () => {
        if (gqlSchemaTsInterfaces.indexOf(options.mutationInterfaceName) == -1) {
            console.error(`Mutation interface not found for name ${options.mutationInterfaceName} in schema located by path ${gqlSchemaRequest}.`)
            return ""
        } else return `import { ${options.mutationInterfaceName} } from ${gqlSchemaRequest};`
    }

    const queryInterfaceImport = () => {
        if (gqlSchemaTsInterfaces.indexOf(options.queryInterfaceName) == -1) {
            console.error(`Query interface not found for name ${options.queryInterfaceName} in schema located by path ${gqlSchemaRequest}.`)
            return ""
        } else return `import { ${options.queryInterfaceName} } from ${gqlSchemaRequest};`
    }
    const validVariableNames = operations
        .filter(([operation, f]) => gqlSchemaTsInterfaces.indexOf(options.variableInterfaceName(operation.name.value)) !== -1)
        .map(([op, f]) =>  options.variableInterfaceName(op.name.value))

    const imports = validVariableNames.map((n) => `import { ${n} } from ${gqlSchemaRequest};`)
        .concat([queryInterfaceImport(), mutationInterfaceImport()])
        .filter(Boolean)

    const output = `
        import { GqlModule } from 'gql-webpack-loader';
        ${imports.join(EOL)}

        export default { 
            ${operations.map(renderKeyValue(fragments, generateInterface(options, validVariableNames))).join(',' + EOL)}
        } 
    `
    return output
};

export { GqlQuery, GqlModule }