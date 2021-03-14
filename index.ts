import { FragmentDefinitionNode, OperationDefinitionNode, parse, print } from 'graphql'
import { SelectionSetNode } from "graphql/language/ast";

type FragmentNames = Array<string>
type Operation = [OperationDefinitionNode, FragmentNames]

const lookupFragments = (node: SelectionSetNode, acc: Array<string>): Array<string> => {
    return node ? node.selections.reduce((acc, i) => {
        if (i.kind === "FragmentSpread") return acc.concat(i.name.value)
        else if (i.selectionSet) return lookupFragments(i.selectionSet, acc)
        else return acc
    }, acc) : []
}
const renderOperationNode = (operation: OperationDefinitionNode, fragments: Array<FragmentDefinitionNode>) =>
    `{ 
                query: \`${print(operation).concat(fragments.length ? "\n" + fragments.map(print).join('\n') : "")}\`,
                operation: "${operation.name.value}" 
     }`

const renderKeyValue = (fragments: Array<FragmentDefinitionNode>) =>
    ([operation, fragmentNames]: [OperationDefinitionNode, FragmentNames]) => {
        let frags = fragments.filter((fragment) => fragmentNames.indexOf(fragment.name.value) !== -1)
        return `"${operation.name.value}": ${renderOperationNode(operation, frags)}`
    }

export default function (source) {
    const gqlDocumentNode = parse(source)

    const [operations, fragments]: [Array<Operation>, Array<FragmentDefinitionNode>] =
        gqlDocumentNode.definitions.reduce(([operations, fragments], operation) => {
            if (operation.kind === "OperationDefinition") {
                operations.push([operation, lookupFragments(operation.selectionSet, [])])
                return [operations, fragments]
            } else if (operation.kind === "FragmentDefinition")
                return [operations, fragments.concat(operation)]

            return [operations, fragments]
        }, [[], []])

    return `export default { \n ${operations.map(renderKeyValue(fragments)).join(',')} \n }`
};