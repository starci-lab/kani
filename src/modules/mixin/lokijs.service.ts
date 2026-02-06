import {
    Injectable
} from "@nestjs/common"
import {
    Collection
} from "lokijs"
import type {
    CreateCollectionParams,
    CreateCollectionResult
} from "./types"

@Injectable()
export class LokiJSService {
    /**
     * Internal map holding all LokiJS collections by name.
     */
    public collectionMap: Map<string, Collection> = new Map()

    /**
     * Get an existing collection by name.
     */
    getCollection<T extends object>(name: string): Collection<T> {
        return this.collectionMap.get(name) as Collection<T>
    }

    /**
     * Create a LokiJS collection if it does not exist; otherwise return existing.
     */
    async createCollection<T extends object>(
        params: CreateCollectionParams<T>,
    ): Promise<CreateCollectionResult<T>> {
        const { name, options } = params
        if (this.collectionMap.has(name)) {
            return this.getCollection<T>(name)
        }
        const collection = new Collection<T>(name,
            options)
        this.collectionMap.set(name,
            collection)
        return collection
    }
}