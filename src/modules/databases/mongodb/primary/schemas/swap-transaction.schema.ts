import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { Field, ID } from "@nestjs/graphql"
import { Schema as MongooseSchema, Types } from "mongoose"
import { BotSchema } from "./bot.schema"
import { TokenSchema } from "./token.schema"
import { ChainId, GraphQLTypeChainId, GraphQLTypeNetwork, Network } from "@typedefs"

@Schema({
    timestamps: true,
    collection: "swap-transactions",
})
export class SwapTransactionSchema extends AbstractSchema {
    @Field(() => String, {
        description: "The hash of the swap transaction",
    })
    @Prop({ type: String, required: true })
        txHash: string

    @Field(() => ID, {
        description: "The bot that the swap transaction is associated with",
    })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: BotSchema.name })
        bot: BotSchema | Types.ObjectId

    @Field(() => ID, {
        description: "The token in that the swap transaction is associated with",
    })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: TokenSchema.name })
        tokenIn: TokenSchema | Types.ObjectId

    @Field(() => ID, {
        description: "The token out that the swap transaction is associated with",
    })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: TokenSchema.name })
        tokenOut: TokenSchema | Types.ObjectId

    @Field(() => String, {
        description: "The amount of the token in that the swap transaction is associated with",
    })
    @Prop({ type: String, required: true })
        amountIn: string

    @Field(() => GraphQLTypeChainId, {
        description: "The chain id of the swap transaction",
    })
    @Prop({ type: String, required: true })
        chainId: ChainId

    @Field(() => GraphQLTypeNetwork, {
        description: "The network of the swap transaction",
    })
    @Prop({ type: String, required: true })
        network: Network
}

export const SwapTransactionSchemaClass = SchemaFactory.createForClass(SwapTransactionSchema)
