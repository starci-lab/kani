import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { Field, ID, ObjectType } from "@nestjs/graphql"
import { LiquidityPoolSchema } from "./liquidity-pool.schema"
import { Schema as MongooseSchema } from "mongoose"
import { BotSchema } from "./bot.schema"
import { JobType, GraphQLTypeJobType, GraphQLTypeJobStatus, JobStatus, TokenId } from "../enums"
import GraphQLJSON from "graphql-type-json"

@ObjectType({
    description: "Represents a job",
})
@Schema({
    timestamps: true,
    collection: "jobs",
})
export class JobSchema extends AbstractSchema {
    @Field(() => ID, { description: "Reference to the liquidity pool associated with this position", nullable: true })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: LiquidityPoolSchema.name, required: false })
        liquidityPoolId?: LiquidityPoolSchema | MongooseSchema.Types.ObjectId

    @Field(() => ID, { description: "Reference to the bot associated with this job" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: BotSchema.name })
        botId: BotSchema | MongooseSchema.Types.ObjectId

    @Field(() => GraphQLTypeJobType, { description: "The type of the job" })
    @Prop({ type: String, enum: JobType })
        type: JobType

    @Field(() => GraphQLTypeJobStatus, { description: "The status of the job" })
    @Prop({ type: String, enum: JobStatus })
        status: JobStatus
    
    @Field(() => String, { description: "The transaction hash of the job" })
    @Prop({ type: String, required: false })
        txHash?: string

    @Field(() => String, { description: "The transaction hash of the job fee amount A" })
    @Prop({ type: String, required: false })
        feeAmountA?: string

    @Field(() => String, { description: "The transaction hash of the job fee amount B" })
    @Prop({ type: String, required: false })
        feeAmountB?: string

    @Field(() => String, { description: "The transaction hash of the job tick lower" })
    @Prop({ type: String, required: false })
        tickLower?: string

    @Field(() => String, { description: "The transaction hash of the job tick upper" })
    @Prop({ type: String, required: false })
        tickUpper?: string

    @Field(() => String, { description: "The transaction hash of the job amount A" })
    @Prop({ type: String, required: false })
        amountA?: string

    @Field(() => String, { description: "The transaction hash of the job amount B" })
    @Prop({ type: String, required: false })
        amountB?: string

    @Field(() => String, { description: "The transaction hash of the job min bin id" })
    @Prop({ type: String, required: false })
        minBinId?: string

    @Field(() => String, { description: "The transaction hash of the job max bin id" })
    @Prop({ type: String, required: false })
        maxBinId?: string

    @Field(() => GraphQLJSON, { description: "The transaction hash of the job metadata" })
    @Prop({ type: MongooseSchema.Types.Mixed, required: false })
        metadata?: unknown

    @Field(() => String, { description: "The additional data of the job" })
    @Prop({ type: MongooseSchema.Types.Mixed, required: false })
        data?: unknown
}

export const JobSchemaClass = SchemaFactory.createForClass(JobSchema)

// get the order of the job status
export const getJobStatusOrder = (status: JobStatus): number => {
    switch (status) {
    case JobStatus.Pending: return 0
    case JobStatus.Prepared: return 1
    case JobStatus.Executed: return 2
    case JobStatus.Completed: return 3
    case JobStatus.Failed: return 4
    }
}

export interface ReconcileBalanceJobData {
    needsSwap: boolean
    tokenIn: TokenId
    tokenOut: TokenId
}