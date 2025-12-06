import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { Field, ID, ObjectType } from "@nestjs/graphql"
import { ChainId, GraphQLTypeChainId } from "@modules/common"
import { Schema as MongooseSchema, Types } from "mongoose"
import { UserSchema } from "./user.schema"
import { TokenSchema } from "./token.schema"
import { LiquidityPoolSchema } from "./liquidity-pool.schema"
import { 
    ExplorerId, 
    GraphQLTypeExplorerId
} from "../enums"
import { PositionSchema } from "./position.schema"
/**
 * GraphQL object type representing a bot.
 * Each bot corresponds to a wallet running automated LP strategies
 * on a specific blockchain.
 */
@ObjectType({
    description: "Represents a bot",
})
@Schema({
    timestamps: true,
    collection: "bots",
})
export class BotSchema extends AbstractSchema {
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
        nullable: true,
    })
    @Prop({ type: String, required: false })
        name?: string

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

    @Field(() => ID, {
        description: "Primary token the bot aims to accumulate through its liquidity strategy.",
    })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: TokenSchema.name })
        targetToken: TokenSchema | Types.ObjectId

    @Field(() => ID, {
        description: "The secondary token paired with the target token in the liquidity position.",
    })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: TokenSchema.name })
        quoteToken: TokenSchema | Types.ObjectId

    // we use snapshot to reduce on-chain calls and improve performance
    @Field(() => String, {
        description: "The snapshot of the target balance amount",
        nullable: true,
    })
    @Prop({ type: String, required: false })
        snapshotTargetBalanceAmount?: string
    
    @Field(() => String, {
        description: "The snapshot of the quote balance amount",
        nullable: true,
    })
    @Prop({ type: String, required: false })
        snapshotQuoteBalanceAmount?: string

    @Field(() => String, {
        description: "The snapshot of the gas balance amount",
        nullable: true,
    })
    @Prop({ type: String, required: false })
        snapshotGasBalanceAmount?: string

    @Field(() => Date, {
        description: "The date and time the last snapshot was taken",
        nullable: true,
    })
    @Prop({ type: Date, required: false })
        lastBalancesSnapshotAt?: Date
    
    // active position
    activePosition?: PositionSchema
}
/**
 * The actual Mongoose schema generated from the class definition above.
 * This is what gets registered with the NestJS Mongoose module.
 */
export const BotSchemaClass = SchemaFactory.createForClass(BotSchema)
