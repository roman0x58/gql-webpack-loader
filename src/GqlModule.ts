import { GqlTypedString } from "./GqlTypedString";
import { GqlQuery } from "./GqlQuery";

export interface GqlModule<T extends GqlQuery, V> {
    operation: string
    query: GqlTypedString<T, V>
}