import { Injectable } from "@nestjs/common"
import { Collection } from "lokijs"

@Injectable()
export class LokiJSService {
    /**
     * Internal map holding all LokiJS collections by name.
     * Acts as an in-memory registry to avoid duplicate collections.
     */
    public collectionMap: Map<string, Collection> = new Map()

    /**
     * Get an existing collection by name.
     * The caller is responsible for ensuring the collection exists.
     */
    getCollection<T extends object>(name: string): Collection<T> {
        return this.collectionMap.get(name) as Collection<T>
    }

    /**
     * Create a new LokiJS collection if it does not already exist.
     * If the collection already exists, return the existing instance.
     *
     * @param name - Collection name
     * @param options - Optional LokiJS collection options
     */
    async createCollection<T extends object>(
        name: string,
        options?: Partial<CollectionOptions<T>>
    ): Promise<Collection<T>> {
        // Return existing collection to prevent duplicates
        if (this.collectionMap.has(name)) {
            return this.getCollection<T>(name)
        }
        // Create and register a new collection
        const collection = new Collection<T>(name, options)
        this.collectionMap.set(name, collection)
        // Return the new collection
        return collection
    }
}