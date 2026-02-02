import {
    Prop, Schema, SchemaFactory
} from "@nestjs/mongoose"
import {
    AbstractSchema
} from "./abstract"
import {
    Field, Float, ID, ObjectType
} from "@nestjs/graphql"
import {
    ChainId, EncryptedPayload, GraphQLTypeChainId
} from "@modules/typedefs"
import {
    Schema as MongooseSchema, Types
} from "mongoose"
import {
    UserSchema
} from "./user.schema"
import {
    TokenSchema
} from "./token.schema"
import {
    LiquidityPoolSchema
} from "./liquidity-pool.schema"
import {
    AppVersion,
    BotStatus,
    GraphQLTypeAppVersion,
    GraphQLTypeBotStatus,
    GraphQLTypePerformanceDisplayMode,
    PerformanceDisplayMode,
} from "../enums"
import {
    BotActivePositionSchema, BotActivePositionSchemaClass
} from "./bot-active-position.schema"
import {
    PrivyMetadataSchema, PrivyMetadataSchemaClass
} from "./privy-metadata.schema"
import {
    BotSnapshotsSchema,
    BotSnapshotsSchemaClass,
} from "./bot-snapshots.schema"
import {
    PrimaryMongoDbCollectionRef,
} from "../ref"
import {
    ActiveJobSchema, ActiveJobSchemaClass
} from "./active-job.schema"
import {
    BotChartConfigSchema,
    BotChartConfigSchemaClass,
} from "./bot-chart-config.schema"

@ObjectType({
    description: "Represents a bot",
})
export class BotPerformance24H {
    @Field(() => Float,
        {
            description: "The return on investment (ROI) percentage of the bot in the last 24 hours",
        })
        roi: number
    @Field(() => Float,
        {
            description: "The profit and loss (PnL) in token units of the bot in the last 24 hours",
        })
        pnl: number
    @Field(() => Float,
        {
            description: "The return on investment (ROI) percentage in USD of the bot in the last 24 hours",
        })
        roiInUsd: number
    @Field(() => Float,
        {
            description: "The profit and loss (PnL) in USD of the bot in the last 24 hours",
        })
        pnlInUsd: number
}

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
    @Field(() => String,
        {
            description: "The account address of the wallet",
        })
    @Prop({
        type: String
    })
        accountAddress: string

    /**
     * The encrypted private key corresponding to the account address.
     * This value must be securely encrypted before being stored in the database.
     */
    @Prop({
        type: MongooseSchema.Types.Mixed, required: false
    })
        encryptedPrivateKeyPayload?: EncryptedPayload

    /**
     * The encrypted privy signer private key corresponding to the account address.
     * This value must be securely encrypted before being stored in the database.
     */
    @Prop({
        type: MongooseSchema.Types.Mixed, required: false
    })
        encryptedPrivySignerPrivateKeyPayload?: EncryptedPayload

    /**
     * The metadata of the privy wallet.
     */
    @Prop({
        type: PrivyMetadataSchemaClass, required: false
    })
        privyMetadata?: PrivyMetadataSchema

    /**
     * The blockchain network where this bot is operating (e.g., SUI, SOLANA).
     * This determines which on-chain protocol and RPC endpoints are used.
     */
    @Field(() => GraphQLTypeChainId)
    @Prop({
        type: String, required: true
    })
        chainId: ChainId

    /**
     * The user that the bot is provisioned to.
     */
    @Field(() => ID,
        {
            description: "The user that the bot is provisioned to"
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.User,
    })
        user: UserSchema | Types.ObjectId

    /**
     * The human-readable name of the bot, used for easy identification and management.
     */
    @Field(() => String,
        {
            description:
                "Human-readable name of the bot, used for easy identification and management.",
        })
    @Prop({
        type: String, required: true
    })
        name: string

    /**
     * The list of liquidity pools where this bot will actively manage positions.
     */
    @Field(() => [ID],
        {
            description:
                "List of liquidity pools where this bot will actively manage positions.",
        })
    @Prop({
        type: [MongooseSchema.Types.ObjectId],
        ref: PrimaryMongoDbCollectionRef.LiquidityPool,
    })
        liquidityPools: Array<LiquidityPoolSchema | Types.ObjectId>

    /**
     * Whether the bot is running.
     */
    @Field(() => Boolean,
        {
            description: "Whether the bot is running",
            defaultValue: false,
        })
    @Prop({
        type: Boolean, required: true, default: false
    })
        running: boolean

    /**
     * The date and time the bot was last run.
     */
    @Field(() => Date,
        {
            description: "The date and time the bot was last run",
            nullable: true,
        })
    @Prop({
        type: Date, required: false
    })
        lastRunAt?: Date

    /**
     * The primary token the bot aims to accumulate through its liquidity strategy.
     */
    @Field(() => ID,
        {
            description: "Primary token the bot aims to accumulate through its liquidity strategy.",
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.Token,
    })
        targetToken: TokenSchema | Types.ObjectId

    /**
     * The secondary token paired with the target token in the liquidity position.
     */
    @Field(() => ID,
        {
            description: "The secondary token paired with the target token in the liquidity position.",
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.Token,
    })
        quoteToken: TokenSchema | Types.ObjectId

    /**
     * The balance's snapshots of the bot.
     */
    @Field(
        () => BotSnapshotsSchema,
        {
            description: "The balance's snapshots of the bot",
            nullable: true,
        }
    )
    @Prop(
        {
            type: BotSnapshotsSchemaClass, required: false
        }
    )
        balanceSnapshots?: BotSnapshotsSchema

    /**
     * Whether the bot is exiting to USDC.
     */
    @Field(() => Boolean,
        {
            description: "Whether the bot is exiting to USDC",
            defaultValue: false,
        })
    @Prop({
        type: Boolean, required: true, default: false
    })
        isExitToUsdc: boolean

    @Field(() => GraphQLTypeAppVersion,
        {
            description: "The version of the bot",
            defaultValue: AppVersion.V1,
        })
    @Prop({
        type: String, enum: AppVersion, required: true, default: AppVersion.V1
    })
        version: AppVersion

    /**
     * The active position of the bot.
     */
    @Field(() => BotActivePositionSchema,
        {
            description: "The active position of the bot",
            nullable: true,
        })
    @Prop({
        type: BotActivePositionSchemaClass, required: false
    })
        activePosition?: BotActivePositionSchema

    /**
     * The active job of the bot.
     */

    @Prop({
        type: ActiveJobSchemaClass, required: false
    })
        activeJob?: ActiveJobSchema

    /**
     * The performance of the bot in the last 24 hours.
     */
    @Field(() => BotPerformance24H,
        {
            description: "The performance of the bot in the last 24 hours",
            nullable: true,
        })
        performance24h?: BotPerformance24H

    /**
     * The display mode of the bot's active performance.
     */
    @Field(() => GraphQLTypePerformanceDisplayMode,
        {
            description: "The display mode of the bot's performance",
            nullable: true,
        })
    @Prop({
        type: String, enum: PerformanceDisplayMode, required: false
    })
        performanceDisplayMode?: PerformanceDisplayMode

    /**
        * The display mode of the bot's positions performance.
        */
    @Field(() => GraphQLTypePerformanceDisplayMode,
        {
            description: "The display mode of the positions performance",
            nullable: true,
        })
    @Prop({
        type: String, enum: PerformanceDisplayMode, required: false
    })
        positionsPerformanceDisplayMode?: PerformanceDisplayMode

    /**
     * The chart configuration of the bot (unit and interval).
     */
    @Field(() => BotChartConfigSchema,
        {
            description: "The chart configuration of the bot",
            nullable: true,
        })
    @Prop({
        type: BotChartConfigSchemaClass, required: false
    })
        chartConfig?: BotChartConfigSchema

    /**
     * The status of the bot.
     */
    @Field(
        () => GraphQLTypeBotStatus,
        {
            description: "The status of the bot",
            nullable: true
        }
    )
        status?: BotStatus
    /**
     * The avatar of the bot.
     */
    @Field(() => String,
        {
            description: "The avatar of the bot",
        }
    )
    @Prop({
        type: String, required: true
    })
        avatarUrl: string

    /**
     * The incentive token addresses of the bot.
     */
    @Field(() => [ID],
        {
            description: "The incentive token of the bot",
            nullable: true,
        })
    @Prop(
        {
            type: MongooseSchema.Types.ObjectId,
            ref: PrimaryMongoDbCollectionRef.Token,
            required: false,
        }
    )
        incentiveTokens?: Array<TokenSchema | Types.ObjectId>
}
/**
 * The actual Mongoose schema generated from the class definition above.
 * This is what gets registered with the NestJS Mongoose module.
 */
export const BotSchemaClass = SchemaFactory.createForClass(BotSchema)