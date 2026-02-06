/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Document, 
    Types
} from "mongoose"
import type {
    NormalizeSchemaType 
} from "./types"

export const normalizeMongoose = (schema: NormalizeSchemaType): void => {
    const {
        toJSON,
        normalizeId,
        removeVersion,
        removePrivatePaths,
        toJSON: { transform } = {
        },
    } = schema.options

    const json = {
        transform(doc: Document, returnValue: any, options: any): void {
            if (!removePrivatePaths) {
                const { paths } = schema

                for (const path in paths) {
                    if (paths[path].options?.private && returnValue[path]) {
                        delete returnValue[path]
                    }
                }
            }

            if (!removeVersion) {
                const { __v } = returnValue

                if (__v === undefined) {
                    delete returnValue.__v
                }
            }

            if (!normalizeId) {
                const { _id, id } = returnValue

                if (_id && !id) {
                    returnValue.id = _id.toString()
                    delete returnValue._id
                }
            }

            returnValue = deepNormalizeObjectId(returnValue)
            if (transform) {
                return transform(doc,
                    returnValue,
                    options)
            }
        },
    }

    schema.options.toJSON = {
        ...toJSON, ...json 
    }
}

const deepNormalizeObjectId = (obj: unknown): unknown => {
    if (!obj) return obj
    if (obj instanceof Types.ObjectId) {
        return obj.toString()
    }
    if (Array.isArray(obj)) {
        return obj.map(deepNormalizeObjectId)
    }
    if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
            obj[key] = deepNormalizeObjectId(obj[key])
        }
    }
    return obj
}