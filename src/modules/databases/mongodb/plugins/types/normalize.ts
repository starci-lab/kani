/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
    Document, Schema 
} from "mongoose"

/** Options for the normalize Mongoose plugin (toJSON behavior). */
export interface NormalizeMongooseOptions {
    normalizeId?: boolean
    removeVersion?: boolean
    removePrivatePaths?: boolean
    toJSON?: {
        transform?: (doc: Document, returnValue: any, options: any) => any
    }
}

/** Schema type with normalize options on schema.options. */
export type NormalizeSchemaType = Schema & { options: NormalizeMongooseOptions }
