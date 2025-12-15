import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { Field, ID } from "@nestjs/graphql"
import { Schema as MongooseSchema, Types } from "mongoose"
import { BotSchema } from "./bot.schema"
import { ChainId, GraphQLTypeChainId } from "@typedefs"
import { GraphQLTypeTransactionType, TokenId, TransactionType } from "../enums"
import GraphQLJSON from "graphql-type-json"

@Schema({
    timestamps: true,
    collection: "swap-transactions",
})
export class TransactionSchema extends AbstractSchema {
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

    @Field(() => GraphQLTypeChainId, {
        description: "The chain id of the swap transaction",
    })
    @Prop({ type: String, required: true })
        chainId: ChainId

    @Field(() => GraphQLTypeTransactionType, {
        description: "The type of the transaction",
    })
    @Prop({ type: String, required: true, enum: TransactionType })
        type: TransactionType

    @Field(() => GraphQLJSON, { 
        description: "Additional transaction-specific metadata stored as flexible key-value JSON. Used for protocol extensions, cached vault info, or program-derived values.",
        nullable: true 
    })
    @Prop({ type: MongooseSchema.Types.Mixed })
        metadata?: unknown 
}

export const TransactionSchemaClass = SchemaFactory.createForClass(TransactionSchema)

export interface SwapTransactionMetadata {
    tokenIn: TokenId
    tokenOut: TokenId
    amountIn: string
    amountOut?: string
}