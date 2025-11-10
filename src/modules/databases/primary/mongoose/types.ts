import { Document } from "mongoose"

export interface MongooseOptions {
    withSeeders?: boolean
    withMemDb?: boolean
}

export interface KeyValueRecord<T> extends Document {
    value: T
}