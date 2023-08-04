export interface QueryModel {
    someQueryOperation: someQueryOperationResultType
}

export interface MutationModel {
    someMutationOperation: someMutationOperationResultType
}

export interface someQueryOperationResultType {
    field1: string
    field2: number
    field3: string
}

export interface someMutationOperationResultType {
    field1: string
    field2: number
    field3: string
}

export interface QuerySomeQueryOperationArgsModel {
    id: string
}

export interface MutationSomeMutationOperationArgsModel {
    id: string
}