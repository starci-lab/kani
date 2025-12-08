import { Field, Float, Int } from "@nestjs/graphql"
import { Prop, Schema } from "@nestjs/mongoose"
import { LiquidityPoolSchema } from "./liquidity-pool.schema"
import { SchemaFactory } from "@nestjs/mongoose"
import { Schema as MongooseSchema } from "mongoose"
import { ObjectType } from "@nestjs/graphql"
import { AbstractSchema } from "./abstract"
import { ID } from "@nestjs/graphql"
import BN from "bn.js"
import { BotSchema } from "./bot.schema"
import { ChainId, GraphQLTypeChainId } from "@typedefs"
import { GraphQLJSON } from "graphql-type-json"

@Schema({ collection: "positions", timestamps: true })
@ObjectType()
export class PositionSchema extends AbstractSchema {

    @Field(() => String, { description: "Transaction hash that created this position" })
    @Prop({
        unique: true,
        type: String,
        required: true,
    })
        openTxHash: string

    @Field(() => ID, { description: "Reference to the liquidity pool associated with this position" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: LiquidityPoolSchema.name })
        liquidityPool: LiquidityPoolSchema | MongooseSchema.Types.ObjectId

    @Field(() => String, { description: "The snapshot of the target balance amount before opening the position" })
    @Prop({ type: String, required: true })
        snapshotTargetBalanceAmountBeforeOpen: string

    @Field(() => String, { description: "The snapshot of the quote balance amount before opening the position" })
    @Prop({ type: String, required: true })
        snapshotQuoteBalanceAmountBeforeOpen: string

    @Field(() => String, { description: "The snapshot of the gas balance amount before opening the position", nullable: true })
    @Prop({ type: String, required: false })
        snapshotGasBalanceAmountBeforeOpen?: string

    @Field(() => String, { description: "The snapshot of the target balance amount after closing the position", nullable: true })
    @Prop({ type: String, required: false })
        snapshotTargetBalanceAmountAfterClose?: string

    @Field(() => String, { description: "The snapshot of the quote balance amount after closing the position", nullable: true })
    @Prop({ type: String, required: false })
        snapshotQuoteBalanceAmountAfterClose?: string

    @Field(() => String, { description: "The snapshot of the gas balance amount after closing the position", nullable: true })
    @Prop({ type: String, required: false })
        snapshotGasBalanceAmountAfterClose?: string

    @Field(() => String, { description: "Liquidity amount minted for this position", nullable: true })
    @Prop({ type: String, required: false })
        liquidity?: BN

    @Field(() => Int, { description: "Lower tick boundary of the position's price range", nullable: true })
    @Prop({ type: Number, required: false })
        tickLower?: number

    @Field(() => Int, { description: "Upper tick boundary of the position's price range", nullable: true })
    @Prop({ type: Number, required: false })
        tickUpper?: number

    @Field(() => String, { description: "Amount of target tokens spent to open the position", nullable: true })
    @Prop({ type: String, required: false })
        amountA?: string

    @Field(() => String, { description: "Amount of quote tokens spent to open the position", nullable: true })
    @Prop({ type: String, required: false })
        amountB?: string
        
    @Field(() => Int, { description: "Lower bin id of the position's price range", nullable: true })
    @Prop({ type: Number, required: false })
        minBinId?: number

    @Field(() => Int, { description: "Lower bin id of the position's price range", nullable: true })
    @Prop({ type: Number, required: false })
        maxBinId?: number

    @Field(() => String, { description: "Reference to the bot that created this position" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: BotSchema.name })
        bot: BotSchema | MongooseSchema.Types.ObjectId

    @Field(() => GraphQLTypeChainId, { 
        description: "The blockchain chain ID where this position is created" 
    })
    @Prop({ type: String, enum: ChainId, required: true })
        chainId: ChainId

    @Field(() => Boolean, { description: "Whether the target token is token A in the liquidity pool" })
    @Prop({ type: Boolean, default: true })
        targetIsA: boolean

    @Field(() => Date, { description: "The date and time this position was opened" })
    @Prop({ type: Date, required: true })
        positionOpenedAt: Date

    @Field(() => String, { description: "On-chain identifier of this position" })
    @Prop({ type: String, required: false })
        positionId: string

    @Field(() => Boolean, { description: "Whether the position is active", nullable: true })
    @Prop({ type: Boolean, default: true })
        isActive: boolean

    @Field(() => String, { description: "Transaction hash that closed this position", nullable: true })
    @Prop({ type: String, required: false })
        closeTxHash?: string

    @Field(() => Date, { description: "The date and time this position was closed", nullable: true })
    @Prop({ type: Date, required: false })
        positionClosedAt?: Date

    @Field(() => Float, { 
        description: "The return on investment (ROI) percentage of the position", 
        nullable: true 
    })
    @Prop({ type: Number, required: false })
        roi?: number

    @Field(() => Float, { 
        description: "The profit or loss in percentage of the position", 
        nullable: true 
    })
    @Prop({ type: Number, required: false })
        pnl?: number
    
    @Field(() => GraphQLJSON, { 
        description: "Additional position-specific metadata stored as flexible key-value JSON. Used for protocol extensions, cached vault info, or program-derived values.",
        nullable: true 
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: false })
        metadata?: unknown
 
    @Field(() => String, { 
        description: "The amount of target tokens paid as fees for the position", 
    })
    @Prop({ type: String })
        feeAmountTarget: string

    @Field(() => String, { 
        description: "The amount of quote tokens paid as fees for the position", 
    })
    @Prop({ type: String })
        feeAmountQuote: string
}
export const PositionSchemaClass = SchemaFactory.createForClass(PositionSchema)

export interface RaydiumPositionMetadata {
    nftMintAddress: string
}

export interface OrcaPositionMetadata {
    nftMintAddress: string
}