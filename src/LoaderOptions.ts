import { OperationNode } from "../index";

export interface LoaderOptions {
    debug?:boolean
    declaration?: boolean
    gqlSchemaPath?: string
    mutationInterfaceName?: string
    queryInterfaceName?: string
    variableInterfaceName?: (operation: OperationNode) => string
}