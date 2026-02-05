import {
    Field,
} from "@nestjs/graphql"
import {
    Prop,
    Schema,
} from "@nestjs/mongoose"
import {
    SchemaFactory,
} from "@nestjs/mongoose"
import {
    Schema as MongooseSchema,
} from "mongoose"
import {
    ObjectType,
    ID,
} from "@nestjs/graphql"

import {
    AbstractSchema,
} from "./abstract"
import {
    LiquidityPoolSchema,
} from "./liquidity-pool.schema"
import {
    BotSchema,
} from "./bot.schema"
import {
    ChainId,
    GraphQLTypeChainId,
} from "@modules/typedefs"
import {
    GraphQLJSON,
} from "graphql-type-json"

import {
    PositionSettlementSchema,
    PositionSettlementSchemaClass,
} from "./position-settlement.schema"
import {
    PrimaryMongoDbCollectionRef,
} from "../ref"
import {
    PositionClmmStateSchema,
    PositionClmmStateSchemaClass,
} from "./position-clmm-state.schema"
import {
    PositionDlmmStateSchema,
    PositionDlmmStateSchemaClass,
} from "./position-dlmm-state.schema"
import {
    PositionFeesSchema,
    PositionFeesSchemaClass,
} from "./position-fees.schema"
import {
    PositionSnapshotsSchema,
    PositionSnapshotsSchemaClass,
} from "./position-snapshots.schema"
import {
    PositionPerformanceSchema,
    PositionPerformanceSchemaClass,
} from "./position-performance.schema"

/**
 * PositionSchema
 *
 * Represents a single trading / liquidity position created by a bot
 * on a specific blockchain and liquidity pool.
 *
 * This schema stores:
 * - immutable identifiers (tx hash, pool, chain)
 * - protocol-specific state (CLMM / DLMM)
 * - lifecycle snapshots (open / close)
 * - computed performance metrics (ROI, PnL)
 * - settlement & fee information
 */
@Schema({
    collection: "positions",
    timestamps: true,
})
@ObjectType()
export class PositionSchema extends AbstractSchema {

    /**
     * On-chain transaction hash that created (opened) this position.
     * Guaranteed to be unique across all positions.
     */
    @Field(() => [String],
        {
            description: "Transaction hashes that created this position",
        })
    @Prop({
        type: [String],
        required: true,
    })
        openTxHashes: Array<string>

    /**
     * Reference to the liquidity pool where this position was opened.
     * Stored as ObjectId and resolved lazily in GraphQL.
     */
    @Field(() => ID,
        {
            description: "Reference to the liquidity pool associated with this position",
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.LiquidityPool,
    })
        liquidityPool: LiquidityPoolSchema | MongooseSchema.Types.ObjectId

    /**
     * CLMM-specific state captured at position creation.
     * Includes tick range and liquidity parameters.
     *
     * Present only for CLMM-based protocols.
     */
    @Field(() => PositionClmmStateSchema,
        {
            nullable: true,
        })
    @Prop({
        type: PositionClmmStateSchemaClass,
        required: false,
    })
        clmmState?: PositionClmmStateSchema

    /**
     * DLMM-specific state captured at position creation.
     * Includes bin range and distribution parameters.
     *
     * Present only for DLMM-based protocols.
     */
    @Field(() => PositionDlmmStateSchema,
        {
            nullable: true,
        })
    @Prop({
        type: PositionDlmmStateSchemaClass,
        required: false,
    })
        dlmmState?: PositionDlmmStateSchema

    /**
     * Reference to the bot instance that created and manages this position.
     */
    @Field(() => ID,
        {
            description: "Reference to the bot that created this position",
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.Bot,
    })
        bot: BotSchema | MongooseSchema.Types.ObjectId

    /**
     * Blockchain network where this position exists
     * (e.g. Solana, Aptos, Ethereum).
     */
    @Field(() => GraphQLTypeChainId,
        {
            description: "The blockchain chain ID where this position is created",
        })
    @Prop({
        type: String,
        enum: ChainId,
        required: true,
    })
        chainId: ChainId

    /**
     * Protocol-specific on-chain identifier of the position.
     *
     * Examples:
     * - NFT mint address
     * - PDA / position account
     */
    @Field(() => String,
        {
            description: "On-chain identifier of this position",
        })
    @Prop({
        type: String,
        required: false,
    })
        positionId: string

    /**
     * Indicates whether the position is currently active (open).
     * Set to false once the position is closed or settled.
     */
    @Field(() => Boolean,
        {
            description: "Whether the position is active",
            nullable: true,
        })
    @Prop({
        type: Boolean,
        default: true,
    })
        isActive: boolean

    /**
     * On-chain transaction hash that closed this position.
     * Present only after the position is closed.
     */
    @Field(() => [String],
        {
            description: "Transaction hashes that closed this position",
            nullable: true,
        })
    @Prop({
        type: [String],
        required: false,
    })
        closeTxHashes?: Array<string>

    /**
     * Snapshot captured at the time the position was opened.
     *
     * Includes:
     * - token balances
     * - position value (token & USD)
     *
     * Used as the baseline for performance calculations.
     */
    @Field(() => PositionSnapshotsSchema,
        {
            description: "Snapshot information for this position",
            nullable: true,
        })
    @Prop({
        type: PositionSnapshotsSchemaClass,
        required: false,
    })
        openSnapshot?: PositionSnapshotsSchema

    /**
     * Snapshot captured at the time the position was closed.
     */
    @Field(() => PositionSnapshotsSchema,
        {
            description: "Snapshot information for this position",
            nullable: true,
        })
    @Prop({
        type: PositionSnapshotsSchemaClass,
        required: false,
    })
        closeSnapshot?: PositionSnapshotsSchema

    /**
     * Performance metrics computed from open and close snapshots.
     *
     * Includes:
     * - ROI and PnL in token units
     * - ROI and PnL in USD
     */
    @Field(() => PositionPerformanceSchema,
        {
            description: "Performance metrics for this position",
            nullable: true,
        })
    @Prop({
        type: PositionPerformanceSchemaClass,
        required: false,
    })
        performance?: PositionPerformanceSchema

    /**
     * Protocol-specific metadata stored as a flexible JSON object.
     *
     * Used for:
     * - NFT / position account info
     * - vault caching
     * - protocol extensions
     */
    @Field(() => GraphQLJSON,
        {
            description:
            "Additional position-specific metadata stored as flexible key-value JSON",
            nullable: true,
        })
    @Prop({
        type: MongooseSchema.Types.Mixed,
        required: false,
    })
        metadata?: unknown

    /**
     * Accumulated fees earned by this position,
     * expressed from target/quote asset perspective.
     */
    @Field(() => PositionFeesSchema,
        {
            description: "Fee amounts for this position (target/quote perspective)",
        })
    @Prop({
        type: PositionFeesSchemaClass,
        required: true,
    })
        fees: PositionFeesSchema

    /**
     * Settlement information after the position is closed.
     *
     * Includes:
     * - final transferred amounts
     * - settlement status
     */
    @Field(() => PositionSettlementSchema,
        {
            description: "The settlement of the position",
            nullable: true,
        })
    @Prop({
        type: PositionSettlementSchemaClass,
        required: false,
    })
        positionSettlement?: PositionSettlementSchema

    /**
     * GraphQL-only field.
     *
     * Fully resolved liquidity pool document for API responses.
     * Not persisted in the database.
     */
    @Field(() => LiquidityPoolSchema,
        {
            description: "The liquidity pool associated with this position",
        })
        associatedLiquidityPool: LiquidityPoolSchema
}

export const PositionSchemaClass =
    SchemaFactory.createForClass(PositionSchema)

/**
 * Protocol-specific metadata typings
 */
export interface RaydiumPositionMetadata {
    nftMintAddress: string
    ataAddress: string
}

export interface OrcaPositionMetadata {
    nftMintAddress: string
    ataAddress: string
}

export interface MeteoraPositionMetadata {
    ataAddress: string
}