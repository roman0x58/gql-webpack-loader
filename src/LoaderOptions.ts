export interface LoaderOptions {
    debug?:boolean
    declaration?: boolean
    gqlSchemaPath?: string
    mutationInterfaceName?: string
    queryInterfaceName?: string
    variableInterfaceName?: (operation: string) => string
}