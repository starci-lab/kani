import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { ChainId, GraphQLTypeChainId, GraphQLTypeNetwork, Network } from "@modules/common"
import { TokenSchema } from "./token.schema"
import { Schema as MongooseSchema, Types } from "mongoose"
import { Field, Float, ID, Int, ObjectType } from "@nestjs/graphql"
import { GraphQLTypeLiquidityPoolId, GraphQLTypeLiquidityPoolType, LiquidityPoolType } from "../enums"
import { LiquidityPoolId } from "../enums"
import { DexSchema } from "./dex.schema"

@Schema({
    timestamps: true,
    collection: "liquidity_pools",
})
@ObjectType({ description: "Represents a liquidity pool between two tokens on a specific DEX" })
export class LiquidityPoolSchema extends AbstractSchema {
    @Field(() => GraphQLTypeLiquidityPoolId, 
        { description: "Unique display identifier for the pool" }
    )
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

    @Field(() => GraphQLTypeNetwork, { description: "Network where this pool exists" })
    @Prop({
        type: String,
        enum: Network,
        required: true,
        default: Network.Mainnet,
    })
        network: Network

    @Field(() => GraphQLTypeChainId, { description: "Chain ID where this pool exists" })
    @Prop({
        type: String,
        enum: ChainId,
        required: true,
        default: ChainId.Sui,
    })
        chainId: ChainId

    @Field(() => [ID], { description: "The reward tokens of the pool" })
    @Prop({ type: [MongooseSchema.Types.ObjectId], ref: TokenSchema.name })
        rewardTokens: Array<TokenSchema | Types.ObjectId>

    @Field(() => GraphQLTypeLiquidityPoolType, { description: "The type of the liquidity pool" })
    @Prop({
        type: String,
        enum: LiquidityPoolType,
        required: true,
        default: LiquidityPoolType.Clmm,
    })
        type: LiquidityPoolType

    @Field(() => Number, { description: "The tick spacing of the pool" })
    @Prop({ type: Number })
        tickSpacing: number

    @Field(() => Boolean, { description: "Whether the pool is active" })
    @Prop({ type: Boolean, default: true })
        isActive: boolean

    @Field(() => Int, { description: "The tick spacing multiplier of the pool" })
    @Prop({ type: Number, default: 1 })
        tickMultiplier: number
}

export const LiquidityPoolSchemaClass = SchemaFactory.createForClass(LiquidityPoolSchema)