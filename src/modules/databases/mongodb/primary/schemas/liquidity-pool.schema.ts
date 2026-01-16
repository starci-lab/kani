import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { ChainId, GraphQLTypeChainId } from "@typedefs"
import { TokenSchema } from "./token.schema"
import { Schema as MongooseSchema, Types } from "mongoose"
import { Field, Float, ID, Int, ObjectType } from "@nestjs/graphql"
import {
    GraphQLTypeLiquidityPoolId,
    GraphQLTypeLiquidityPoolType,
    LiquidityPoolType,
    TokenId,
} from "../enums"
import { LiquidityPoolId } from "../enums"
import { DexSchema } from "./dex.schema"
import { GraphQLJSON } from "graphql-type-json"

/**
 * GraphQL response type for the dynamic liquidity pools query.
 */
@ObjectType({
    description:
        "GraphQL response object for fetching dynamic liquidity pool info.",
})
export class GraphQLDynamicLiquidityPoolInfo {
    @Field(() => Float, {
        nullable: true,
        description: "Current tick index of the liquidity pool.",
    })
        tickCurrent?: number

    @Field(() => Float, {
        nullable: true,
        description: "Current active id of the liquidity pool.",
    })
        activeId?: number

    @Field(() => String, {
        nullable: true,
        description: "Total liquidity of the pool.",
    })
        liquidity?: string

    @Field(() => Float, {
        nullable: true,
        description: "Current price of the pool.",
    })
        price?: number

    @Field(() => Float, {
        nullable: true,
        description: "Trading volume in the last 24 hours.",
    })
        volume24H?: number

    @Field(() => Float, {
        nullable: true,
        description: "Fees generated in the last 24 hours.",
    })
        fees24H?: number

    @Field(() => Float, {
        nullable: true,
        description: "APR calculated over the last 24 hours.",
    })
        apr24H?: number

    @Field(() => String, {
        nullable: true,
        description: "Total value locked (TVL) of the pool.",
    })
        tvl?: string
}

@Schema({
    timestamps: true,
    collection: "liquidity_pools",
})
@ObjectType({
    description:
        "Represents a liquidity pool between two tokens on a specific DEX",
})
export class LiquidityPoolSchema extends AbstractSchema {
    @Field(() => GraphQLTypeLiquidityPoolId, {
        description: "Unique display identifier for the pool",
    })
    @Prop({
        unique: true,
        type: String,
        required: true,
        enum: LiquidityPoolId,
    })
        displayId: LiquidityPoolId

    @Field(() => ID, { description: "The DEX this pool belongs to" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: DexSchema.name })
        dex: DexSchema | Types.ObjectId

    @Field(() => String, { description: "The pool address" })
    @Prop({ type: String })
        poolAddress: string

    @Field(() => ID, { description: "First token in the pool" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: TokenSchema.name })
        tokenA: TokenSchema | Types.ObjectId

    @Field(() => ID, { description: "Second token in the pool" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: TokenSchema.name })
        tokenB: TokenSchema | Types.ObjectId

    @Field(() => Float, { description: "Pool trading fee percentage" })
    @Prop({ type: Number })
        fee: number

    @Field(() => GraphQLTypeChainId, {
        description: "Chain ID where this pool exists",
    })
    @Prop({
        type: String,
        enum: ChainId,
        required: true,
        default: ChainId.Sui,
    })
        chainId: ChainId
    @Field(() => GraphQLTypeLiquidityPoolType, {
        description: "The type of the liquidity pool",
    })
    @Prop({
        type: String,
        enum: LiquidityPoolType,
        required: true,
        default: LiquidityPoolType.Clmm,
    })
        type: LiquidityPoolType

    @Field(() => Number, {
        description: "The tick spacing of the pool",
        nullable: true,
    })
    @Prop({ type: Number, nullable: true })
        tickSpacing: number

    @Field(() => Number, {
        description: "The bin step of the pool",
        nullable: true,
    })
    @Prop({ type: Number, nullable: true })
        binStep: number

    @Field(() => Number, {
        description: "The bin offset of the pool",
        nullable: true,
    })
    @Prop({ type: Number, nullable: true })
        binOffset: number

    @Field(() => Boolean, { description: "Whether the pool is active" })
    @Prop({ type: Boolean, default: true })
        isActive: boolean

    @Field(() => Int, { description: "The tick spacing multiplier of the pool" })
    @Prop({ type: Number, default: 1 })
        tickMultiplier: number

    @Field(() => GraphQLJSON, {
        description:
            "Additional pool-specific metadata stored as flexible key-value JSON. Used for protocol extensions, cached vault info, or program-derived values.",
        nullable: true,
    })
    @Prop({ type: MongooseSchema.Types.Mixed })
        metadata?: unknown

    @Field(() => String, { description: "The URL of the liquidity pool" })
    @Prop({ type: String })
        url: string

    @Field(() => Number, {
        description: "The basis point max of the pool",
        nullable: true,
    })
    @Prop({ type: Number, nullable: true })
        basisPointMax?: number

    @Field(() => GraphQLDynamicLiquidityPoolInfo, {
        description: "The dynamic liquidity pool info",
        nullable: true,
    })
        dynamicInfo?: GraphQLDynamicLiquidityPoolInfo

    @Field(() => Number, {
        description:
            "The WS idle timeout of the liquidity pool (for liquidity pool supporting WS connection)",
        nullable: true,
    })
    @Prop({ type: Number, nullable: true })
        wsIdleTimeoutMs: number
}

export const LiquidityPoolSchemaClass =
    SchemaFactory.createForClass(LiquidityPoolSchema)

// extra interfaces for better type safety
export interface RaydiumLiquidityPoolMetadata {
    programAddress: string;
    tokenVault0: string;
    tokenVault1: string;
}

export interface RaydiumRewardVault {
    tokenId: TokenId;
    vaultAddress: string;
}

export interface MeteoraLiquidityPoolMetadata {
    programAddress: string;
    reserveXAddress: string;
    reserveYAddress: string;
}

export interface OrcaLiquidityPoolMetadata {
    programAddress: string;
    tokenVault0: string;
    tokenVault1: string;
}

export interface FlowXLiquidityPoolMetadata {
    packageId: string;
    poolRegistryObject: string;
    positionRegistryObject: string;
    versionObject: string;
    positionType: string;
    poolType: string;
    i32Type: string;
    poolFeeCollectEventType: string;
    poolRewardCollectEventType: string;
}

export interface CetusLiquidityPoolMetadata {
    intergratePackageId: string;
    globalConfigObject: string;
    clmmPackageId: string;
    rewarderGlobalVaultObject: string;
}

export interface TurbosLiquidityPoolMetadata {
    packageId: string;
    feeType: string;
    positionsObject: string;
    versionObject: string;
}

export interface MomentumLiquidityPoolMetadata {
    packageId: string;
    versionObject: string;
}
