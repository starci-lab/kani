import { AbstractSchema } from "./abstract"
import { Field, ObjectType } from "@nestjs/graphql"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { ConfigId, GraphQLTypeConfigId } from "../enums"
import { GraphQLJSON } from "graphql-type-json"
import { Schema as MongooseSchema } from "mongoose"
import { ChainId } from "@modules/common"

@ObjectType({
    description: "Represents a configuration for the platform.",
})
@Schema({
    timestamps: true,
    collection: "configs",
})
export class ConfigSchema extends AbstractSchema {
    @Field(() => GraphQLTypeConfigId, {
        description: "The id of the config.",
    })
    @Prop({ type: String, required: true, enum: ConfigId })
        displayId: ConfigId

    @Field(() => GraphQLJSON, {
        description: "The value of the config (can be object, array, or primitive).",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        value: Record<string, unknown>
}

export const ConfigSchemaClass = SchemaFactory.createForClass(ConfigSchema)

@ObjectType({
    description: "Represents the gas configuration for the platform.",
})
export class GasConfig {
    @Field(() => GraphQLJSON, {
        description: "The minimum gas required to process a transaction.",
    })
        gasAmountRequired: Partial<Record<ChainId, GasAmountRequired>>
}

@ObjectType({
    description: "Represents the gas thresholds required for the bot’s operation.",
})
export class GasAmountRequired {
    @Field(() => String, {
        description: "The minimum operational gas amount required for the bot to function.",
    })
    @Prop({ type: String, required: true })
        minOperationalAmount: string

    @Field(() => String, {
        description: "The target gas amount the bot aims to maintain during normal operation.",
    })
    @Prop({ type: String, required: true })
        targetOperationalAmount: string
}

@ObjectType({
    description: "Represents the fee to address for the platform.",
})
export class FeeConfig {
    @Field(() => GraphQLJSON, {
        description: "The fee rate for the platform.",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        feeInfo: Partial<Record<ChainId, FeeInfo>>
}

export class FeeInfo {
    feeRate: number
    feeToAddress: string
}

@ObjectType({
    description: "Represents the client configuration for the platform.",
})
export class ClientConfig {
    @Field(() => [String], {
        description: "Cetus aggregator client rpcs",
    })
    @Prop({ type: [String], required: true })
        cetusAggregatorClientRpcs: Array<string>

    @Field(() => [String], {
        description: "SevenK aggregator client rpcs",
    })
    @Prop({ type: [String], required: true })
        sevenKAggregatorClientRpcs: Array<string>

    @Field(() => [String], {
        description: "Cetus clmm client rpcs",
    })
    @Prop({ type: [String], required: true })
        cetusClmmClientRpcs: Array<string>

    @Field(() => [String], {
        description: "SevenK clmm client rpcs",
    })
    @Prop({ type: [String], required: true })
        turbosClmmClientRpcs: Array<string>

    @Field(() => [String], {
        description: "Momentum clmm client rpcs",
    })
    @Prop({ type: [String], required: true })
        momentumClmmClientRpcs: Array<string>

    @Field(() => [String], {
        description: "FlowX clmm client rpcs",
    })
    @Prop({ type: [String], required: true })
        flowXClmmClientRpcs: Array<string>
        
    @Field(() => [String], {
        description: "Jupiter aggregator client rpcs",
    })
    @Prop({ type: [String], required: true })
        jupiterAggregatorClientRpcs: Array<string>

    @Field(() => [String], {
        description: "Raydium clmm client rpcs",
    })
    @Prop({ type: [String], required: true })
        raydiumClmmClientRpcs: Array<string>

    @Field(() => [String], {
        description: "Orca clmm client rpcs",
    })
    @Prop({ type: [String], required: true })
        orcaClmmClientRpcs: Array<string>

    @Field(() => [String], {
        description: "Meteora dlmm client rpcs",
    })
    @Prop({ type: [String], required: true })
        meteoraDlmmClientRpcs: Array<string>

    @Field(() => [String], {
        description: "Solana balance client rpcs",
    })
    @Prop({ type: [String], required: true })
        solanaBalanceClientRpcs: Array<string>
}