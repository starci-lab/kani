import { AbstractSchema } from "./abstract"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { ConfigId } from "../enums"
import { Schema as MongooseSchema } from "mongoose"
import { ChainId } from "@typedefs"

@Schema({
    timestamps: true,
    collection: "configs",
})
export class ConfigSchema extends AbstractSchema {
    @Prop({ type: String, required: true, enum: ConfigId })
        displayId: ConfigId

    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        value: Record<string, unknown>
}

export const ConfigSchemaClass = SchemaFactory.createForClass(ConfigSchema)

export interface GasConfig {
    gasAmountRequired: Partial<Record<ChainId, GasAmountRequired>>
}

export interface GasAmountRequired {
    minOperationalAmount: string
    targetOperationalAmount: string
}

export interface FeeConfig {
    feeInfo: Partial<Record<ChainId, FeeInfo>>
}

export interface FeeInfo {
    feeRate: number
    feeToAddress: string
}

export interface ConfigRecord<T> {
    value: T
}