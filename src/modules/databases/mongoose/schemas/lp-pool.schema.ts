import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { ChainId, GraphQLTypeChainId, GraphQLTypeNetwork, Network } from "@modules/common"
import { TokenSchema } from "./token.schema"
import { Schema as MongooseSchema, Types } from "mongoose"
import { Field, Float, ObjectType } from "@nestjs/graphql"
import { GraphQLTypeLiquidityPoolId } from "../../enums"
import { LiquidityPoolId } from "../../enums"
import { DexSchema } from "./dex.schema"

@Schema({
    timestamps: true,
    collection: "lp-pools",
})
@ObjectType({ description: "Represents a liquidity pool between two tokens on a specific DEX" })
export class LiquidityPoolSchema extends AbstractSchema {
    @Field(() => GraphQLTypeLiquidityPoolId, { description: "Unique display identifier for the pool" })
    @Prop({
        unique: true,
        type: String,
        required: true,
        enum: LiquidityPoolId,
    })
        displayId: LiquidityPoolId

    @Field(() => DexSchema, { description: "The DEX this pool belongs to" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: DexSchema.name })
        dex: DexSchema | Types.ObjectId

    @Field(() => String, { description: "The pool address" })
    @Prop({ type: String })
        poolAddress: string

    @Field(() => TokenSchema, { description: "First token in the pool" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: TokenSchema.name })
        tokenA: TokenSchema | Types.ObjectId

    @Field(() => TokenSchema, { description: "Second token in the pool" })
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
}

export const LiquidityPoolSchemaClass = SchemaFactory.createForClass(LiquidityPoolSchema)