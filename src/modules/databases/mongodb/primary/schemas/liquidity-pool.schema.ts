import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    AbstractSchema 
} from "./abstract"
import {
    ChainId, GraphQLTypeChainId
} from "@modules/common"
import {
    TokenSchema 
} from "./token.schema"
import {
    Schema as MongooseSchema, Types 
} from "mongoose"
import {
    Field, Float, ID, ObjectType 
} from "@nestjs/graphql"
import {
    GraphQLTypeLiquidityPoolId,
    GraphQLTypeLiquidityPoolType,
    LiquidityPoolType,
} from "../enums"
import {
    LiquidityPoolId 
} from "../enums"
import {
    DexSchema 
} from "./dex.schema"
import {
    GraphQLJSON 
} from "graphql-type-json"
import {
    PrimaryMongoDbCollectionRef,
} from "../enums"
import {
    LiquidityPoolClmmStateSchema, LiquidityPoolClmmStateSchemaClass 
} from "./liquidity-pool-clmm-state.schema"
import {
    LiquidityPoolDlmmStateSchema, LiquidityPoolDlmmStateSchemaClass 
} from "./liquidity-pool-dlmm-state.schema"

/** APR breakdown for pool analytics. */
@ObjectType({
    description: "APR breakdown for pool analytics.",
})
export class AprBreakdown {
    // fees APR
    @Field(
        () => String,
        {
            description: "Fees generated in the last 24 hours.",
        })
        fees: string
    // rewards APR
    @Field(
        () => String,
        {
            description: "Rewards generated in the last 24 hours.",
        })
        rewards: string
    // total APR
    @Field(
        () => String,
        {
            description: "Total APR generated in the last 24 hours.",
        })
        total: string
}
/**
 * GraphQL response type for the dynamic liquidity pools query.
 */
@ObjectType({
    description:
        "GraphQL response object for fetching dynamic liquidity pool info.",
})
export class GraphQLLiquidityPoolAnalytics {
    // volume24H
    @Field(
        () => String,
        {
            description: "Trading volume in the last 24 hours.",
        })
        volume24H: string
    // fees24H
    @Field(
        () => String,
        {
            description: "Fees generated in the last 24 hours.",
        })
        fees24H: string
    // apr24H
    @Field(
        () => AprBreakdown,
        {
            description: "APR calculated over the last 24 hours.",
        })
        apr24H: AprBreakdown
    // tvl
    @Field(
        () => String,
        {
            description: "Total value locked (TVL) of the pool.",
        })
        tvl: string
    // liquidity
    @Field(
        () => String,
        {
            description: "Liquidity of the pool.",
        })
        liquidity: string
}

/** Liquidity pool schema. */
@Schema({
    timestamps: true,
    collection: "liquidity_pools",
})
@ObjectType({
    description:
        "Represents a liquidity pool between two tokens on a specific DEX",
})
export class LiquidityPoolSchema extends AbstractSchema {
    @Field(() => GraphQLTypeLiquidityPoolId,
        {
            description: "Unique display identifier for the pool",
        })
    @Prop({
        unique: true,
        type: String,
        required: true,
        enum: LiquidityPoolId,
    })
        displayId: LiquidityPoolId

    @Field(() => ID,
        {
            description: "The DEX this pool belongs to" 
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.Dex,
    })
        dex: DexSchema | Types.ObjectId

    @Field(() => String,
        {
            description: "The pool address" 
        })
    @Prop({
        type: String 
    })
        poolAddress: string

    @Field(() => ID,
        {
            description: "First token in the pool" 
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.Token,
    })
        tokenA: TokenSchema | Types.ObjectId

    @Field(() => ID,
        {
            description: "Second token in the pool" 
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.Token,
    })
        tokenB: TokenSchema | Types.ObjectId

    @Field(() => Float,
        {
            description: "Pool trading fee percentage" 
        })
    @Prop({
        type: Number 
    })
        fee: number

    @Field(() => GraphQLTypeChainId,
        {
            description: "Chain ID where this pool exists",
        })
    @Prop({
        type: String,
        enum: ChainId,
        required: true,
        default: ChainId.Sui,
    })
        chainId: ChainId
    @Field(() => GraphQLTypeLiquidityPoolType,
        {
            description: "The type of the liquidity pool",
        })
    @Prop({
        type: String,
        enum: LiquidityPoolType,
        required: true,
        default: LiquidityPoolType.Clmm,
    })
        type: LiquidityPoolType


    @Field(() => Boolean,
        {
            description: "Whether the pool is active" 
        })
    @Prop({
        type: Boolean, default: true 
    })
        isActive: boolean

    @Field(() => GraphQLJSON,
        {
            description:
            "Additional pool-specific metadata stored as flexible key-value JSON. Used for protocol extensions, cached vault info, or program-derived values.",
            nullable: true,
        })
    @Prop({
        type: MongooseSchema.Types.Mixed 
    })
        metadata?: unknown

    @Field(() => LiquidityPoolClmmStateSchema,
        {
            description: "The CLMM-specific liquidity pool state",
            nullable: true,
        })
    @Prop({
        type: LiquidityPoolClmmStateSchemaClass,
        required: false,
    })
        clmmState?: LiquidityPoolClmmStateSchema

    @Field(() => LiquidityPoolDlmmStateSchema,
        {
            description: "The DLMM-specific liquidity pool state",
            nullable: true,
        })
    @Prop({
        type: LiquidityPoolDlmmStateSchemaClass,
        required: false,
    })
        dlmmState?: LiquidityPoolDlmmStateSchema

    @Field(() => String,
        {
            description: "The URL of the liquidity pool" 
        })
    @Prop({
        type: String 
    })
        url: string

    @Field(() => GraphQLLiquidityPoolAnalytics,
        {
            description: "The dynamic liquidity pool info",
            nullable: true,
        })
        analytics?: GraphQLLiquidityPoolAnalytics

    @Field(() => Float,
        {
            description:
            "The WS idle timeout of the liquidity pool (for liquidity pool supporting WS connection)",
            nullable: true,
        })
    @Prop({
        type: Number, nullable: true
    })
        wsIdleTimeoutMs?: number

    @Field(() => Float,
        {
            description: "The stale time of the dynamic liquidity pool info in milliseconds",
        })
    @Prop({
        type: Number
    })
        staleMs: number
}

export const LiquidityPoolSchemaClass =
    SchemaFactory.createForClass(LiquidityPoolSchema)
