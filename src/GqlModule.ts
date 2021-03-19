import { GqlQuery } from "./GqlQuery";

export interface GqlModule<T, V> {
    operation: string
    query: GqlQuery<T, V>
}