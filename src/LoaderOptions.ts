import { OperationNode } from "../index";

export interface LoaderOptions {
    debug?:boolean
    declaration?: boolean
    gqlSchemaPath?: string
    mutationInterfaceName?: string
    queryInterfaceName?: string
    exportNameBy?:(fileName: string) => string
    variableInterfaceRe?:(operation: OperationNode, fieldName?: string) => RegExp
}