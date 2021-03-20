export interface LoaderOptions {
    gqlSchemaPath: string
    mutationInterfaceName: string
    queryInterfaceName: string
    variableInterfaceName?: (operation: string) => string
}