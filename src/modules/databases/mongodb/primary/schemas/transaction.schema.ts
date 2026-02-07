import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    AbstractSchema 
} from "./abstract"
import {
    Field, ID, ObjectType 
} from "@nestjs/graphql"
import {
    Schema as MongooseSchema, Types 
} from "mongoose"
import {
    BotSchema 
} from "./bot.schema"
import {
    ChainId, GraphQLTypeChainId
} from "@modules/common"
import {
    GraphQLTypeTransactionType, TransactionType, PrimaryMongoDbCollectionRef
} from "../enums"

@ObjectType({
    description: "Represents a transaction",
})
@Schema({
    timestamps: true,
    collection: "transactions",
})
export class TransactionSchema extends AbstractSchema {
    @Field(() => String,
        {
            description: "The hash of the swap transaction",
        })
    @Prop({
        type: String, required: true 
    })
        txHash: string

    @Field(() => ID,
        {
            description: "The bot that the swap transaction is associated with",
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.Bot,
    })
        bot: BotSchema | Types.ObjectId

    @Field(() => GraphQLTypeChainId,
        {
            description: "The chain id of the swap transaction",
        })
    @Prop({
        type: String, required: true 
    })
        chainId: ChainId

    @Field(() => GraphQLTypeTransactionType,
        {
            description: "The type of the transaction",
        })
    @Prop({
        type: String, required: true, enum: TransactionType 
    })
        type: TransactionType

    @Field(() => Date,
        {
            description: "The timestamp of the transaction",
        })
    @Prop({
        type: Date, required: true 
    })
        timestamp: Date
}

export const TransactionSchemaClass = SchemaFactory.createForClass(TransactionSchema)