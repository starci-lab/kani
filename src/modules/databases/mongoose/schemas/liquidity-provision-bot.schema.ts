import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { Field, ID, ObjectType } from "@nestjs/graphql"
import { ChainId, GraphQLTypeChainId } from "@modules/common"
import { Schema as MongooseSchema, Types } from "mongoose"
import { UserSchema } from "./user.schema"
import { TokenSchema } from "./token.schema"
import { LiquidityPoolSchema } from "./liquidity-pool.schema"
import { ExplorerId, GraphQLTypeExplorerId } from "../../enums"
/**
 * GraphQL object type representing a liquidity provision bot.
 * Each bot corresponds to a wallet running automated LP strategies
 * on a specific blockchain.
 */
@ObjectType({
    description: "Represents a liquidity provision bot",
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
        description: "The account address of the wallet",
    })
    @Prop({ type: String, required: false })
        accountAddress: string

    /**
     * The encrypted private key corresponding to the account address.
     * This value must be securely encrypted before being stored in the database.
     */
    @Field(() => String, {
        description: "The encrypted private key of the wallet",
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

    @Field(() => String, {
        description:
            "Human-readable name of the bot, used for easy identification and management.",
    })
    @Prop({ type: String, required: true })
        name: string

    @Field(() => ID, {
        description:
            "Reference to the token that the bot will prioritize when managing liquidity positions.",
    })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: TokenSchema.name })
        priorityToken: TokenSchema | Types.ObjectId

    @Field(() => [ID], {
        description:
            "List of liquidity pools where this bot will actively manage positions.",
    })
    @Prop({
        type: [MongooseSchema.Types.ObjectId],
        ref: LiquidityPoolSchema.name,
    })
        liquidityPools: Array<LiquidityPoolSchema | Types.ObjectId>

    @Field(() => Boolean, {
        description: "Whether the bot is initialized",
    })
    @Prop({ type: Boolean, required: true, default: false })
        initialized: boolean

    @Field(() => [String], {
        description: "The RPC URLs of the bot",
        defaultValue: [],
    })
    @Prop({ type: [String], default: [] })
        rpcUrls: Array<string>

    @Field(() => GraphQLTypeExplorerId, {
        description: "The explorer id of the bot",
        nullable: true,
    })
    @Prop({ type: String, required: false, enum: ExplorerId })
        explorerId: ExplorerId

    @Field(() => Boolean, {
        description: "Whether the bot is running",
        defaultValue: false,
    })
    @Prop({ type: Boolean, required: true, default: false })
        running: boolean

    @Field(() => Date, {
        description: "The date and time the bot was last run",
        nullable: true,
    })
    @Prop({ type: Date, required: false })
        lastRunAt: Date

    @Field(() => Date, {
        description: "The date and time the bot was stopped",
        nullable: true,
    })
    @Prop({ type: Date, required: false })
        stoppedAt: Date
}
/**
 * The actual Mongoose schema generated from the class definition above.
 * This is what gets registered with the NestJS Mongoose module.
 */
export const LiquidityProvisionBotSchemaClass = SchemaFactory.createForClass(
    LiquidityProvisionBotSchema,
)
