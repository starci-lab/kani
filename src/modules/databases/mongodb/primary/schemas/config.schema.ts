import { AbstractSchema } from "./abstract"
import { Field, ObjectType } from "@nestjs/graphql"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { ConfigId, GraphQLTypeConfigId } from "../enums"
import { GraphQLJSON } from "graphql-type-json"
import { Schema as MongooseSchema } from "mongoose"
import { ChainId } from "@typedefs"

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
    description: "Represents the rpcs for the platform.",
})
export class Rpcs {
    @Field(() => [String], {
        description: "Read rpcs",
    })
    @Prop({ type: [String], required: true })
        read: Array<string>

    @Field(() => [String], {
        description: "Write rpcs",
    })
    @Prop({ type: [String], required: true })
        write: Array<string>
}
@ObjectType({
    description: "Represents the client configuration for the platform.",
})
export class ClientConfig {
    @Field(() => Rpcs, {
        description: "Cetus aggregator client rpcs",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        cetusAggregatorClientRpcs: Rpcs

    @Field(() => Rpcs, {
        description: "SevenK aggregator client rpcs",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        sevenKAggregatorClientRpcs: Rpcs

    @Field(() => Rpcs, {
        description: "Cetus clmm client rpcs",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        cetusClmmClientRpcs: Rpcs

    @Field(() => Rpcs, {
        description: "SevenK clmm client rpcs",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        turbosClmmClientRpcs: Rpcs

    @Field(() => Rpcs, {
        description: "Momentum clmm client rpcs",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        momentumClmmClientRpcs: Rpcs

    @Field(() => Rpcs, {
        description: "FlowX clmm client rpcs",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        flowXClmmClientRpcs: Rpcs
        
    @Field(() => Rpcs, {
        description: "Jupiter aggregator client rpcs",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        jupiterAggregatorClientRpcs: Rpcs

    @Field(() => Rpcs, {
        description: "Raydium clmm client rpcs",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        raydiumClmmClientRpcs: Rpcs

    @Field(() => Rpcs, {
        description: "Orca clmm client rpcs",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        orcaClmmClientRpcs: Rpcs

    @Field(() => Rpcs, {
        description: "Meteora dlmm client rpcs",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        meteoraDlmmClientRpcs: Rpcs

    @Field(() => Rpcs, {
        description: "Solana balance client rpcs",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        solanaBalanceClientRpcs: Rpcs

    @Field(() => Rpcs, {
        description: "Sui balance client rpcs",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        suiBalanceClientRpcs: Rpcs
}