import type {
    Collection,
} from "lokijs"

/** Params for creating a LokiJS collection. */
export interface CreateCollectionParams<T extends object> {
    name: string
    options?: Partial<CollectionOptions<T>>
}

/** Result of create collection (the collection instance). */
export type CreateCollectionResult<T extends object> = Collection<T>
