import {
    AbstractSchema 
} from "./abstract"
import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    AuthenticationFactor,
    ConfigId 
} from "../enums"
import {
    Schema as MongooseSchema 
} from "mongoose"
import {
    ChainId 
} from "@modules/typedefs"

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
    // Gas amount to swap when the swap is triggered
    swapAmount: number
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

export interface AvatarsConfig {
    avatarUrls: Array<string>
}

export interface AuthenticationConfig {
    authenticationFactors: Array<AuthenticationFactor>
}