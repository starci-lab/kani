import {
    AbstractSchema 
} from "./abstract"
import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    ConfigId 
} from "../enums"
import {
    Schema as MongooseSchema 
} from "mongoose"
import {
    ChainId 
} from "@typedefs"

@Schema({
    timestamps: true,
    collection: "configs",
})
export class ConfigSchema extends AbstractSchema {
    @Prop({
        type: String, required: true, enum: ConfigId 
    })
        displayId: ConfigId

    @Prop({
        type: MongooseSchema.Types.Mixed, required: true 
    })
        value: Record<string, unknown>
}

export const ConfigSchemaClass = SchemaFactory.createForClass(ConfigSchema)

export interface GasConfig {
    gasAmountRequired: Partial<Record<ChainId, GasAmountRequired>>
}

export interface GasAmountRequired {
    // Minimum gas required for the bot to operate at all
    minOperationalAmount: number
    // Target gas amount for stable and uninterrupted operation
    targetOperationalAmount: number
    // Gas threshold below which a gas swap is required
    // (the swap may use primary or secondary tokens, not gas-only)
    swapThresholdAmount: number
    // Gas amount to swap when the additional swap is triggered
    additionalSwapAmount: number
}

export interface ConfigRecord<T> {
    value: T
}

export interface BalanceRequired {
    minRequiredAmountInUsd: number
}

export interface BalanceConfig {
    balanceRequired: Partial<Record<ChainId, BalanceRequired>>
}

export interface ConfigRecord<T> {
    value: T
}

export interface ProfitConfig {
    accountLimits: Partial<Record<ChainId, AccountLimitsConfig>>
}

export interface AccountLimitsConfig {
    maxBotsPerAccount: number
}