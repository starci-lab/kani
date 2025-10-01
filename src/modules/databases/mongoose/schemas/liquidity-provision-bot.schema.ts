import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { Field, ID, ObjectType } from "@nestjs/graphql"
import { ChainId, GraphQLTypeChainId } from "@modules/common"
import { Schema as MongooseSchema, Types } from "mongoose"
import { UserSchema } from "./user.schema"
/**
 * GraphQL object type representing a liquidity provision bot.
 * Each bot corresponds to a wallet running automated LP strategies
 * on a specific blockchain.
 */
@ObjectType({
    description: "Represents a liquidity provision bot"
})
@Schema({
    timestamps: true,
    collection: "liquidity_provision_bots",
})
export class LiquidityProvisionBotSchema extends AbstractSchema {
    /**
     * The on-chain account address associated with this bot.
     * This address is used to manage liquidity positions and execute transactions.
     */
    @Field(() => String, {
        description: "The account address of the wallet"
    })
    @Prop({ type: String, required: false })
        accountAddress: string

    /**
     * The encrypted private key corresponding to the account address.
     * This value must be securely encrypted before being stored in the database.
     */
    @Field(() => String, {
        description: "The encrypted private key of the wallet"
    })
    @Prop({ type: String, required: false })
        encryptedPrivateKey: string

    /**
     * The blockchain network where this bot is operating (e.g., SUI, SOLANA).
     * This determines which on-chain protocol and RPC endpoints are used.
     */
    @Field(() => GraphQLTypeChainId)
    @Prop({ type: String, required: true })
        chainId: ChainId

    @Field(() => ID, { description: "The user that the bot is provisioned to" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: UserSchema.name })
        user: UserSchema | Types.ObjectId
}

/**
 * The actual Mongoose schema generated from the class definition above.
 * This is what gets registered with the NestJS Mongoose module.
 */
export const LiquidityProvisionBotSchemaClass =
    SchemaFactory.createForClass(LiquidityProvisionBotSchema)