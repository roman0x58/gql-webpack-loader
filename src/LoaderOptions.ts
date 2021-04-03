export interface LoaderOptions {
    gqlSchemaPath: string
    mutationInterfaceName: string
    debug?:boolean
    queryInterfaceName: string
    variableInterfaceName?: (operation: string) => string
}