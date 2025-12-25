import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { Field, ID, ObjectType } from "@nestjs/graphql"
import { LiquidityPoolSchema } from "./liquidity-pool.schema"
import { Schema as MongooseSchema } from "mongoose"
import { BotSchema } from "./bot.schema"
import { JobType, GraphQLTypeJobType, GraphQLTypeJobStatus, JobStatus } from "../enums"

@ObjectType({
    description: "Represents a job",
})
@Schema({
    timestamps: true,
    collection: "jobs",
})
export class JobSchema extends AbstractSchema {
    @Field(() => ID, { description: "Reference to the liquidity pool associated with this position" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: LiquidityPoolSchema.name })
        liquidityPoolId: LiquidityPoolSchema | MongooseSchema.Types.ObjectId

    @Field(() => ID, { description: "Reference to the bot associated with this job" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: BotSchema.name })
        botId: BotSchema | MongooseSchema.Types.ObjectId

    @Field(() => GraphQLTypeJobType, { description: "The type of the job" })
    @Prop({ type: String, enum: JobType })
        type: JobType

    @Field(() => GraphQLTypeJobStatus, { description: "The status of the job" })
    @Prop({ type: String, enum: JobStatus })
        status: JobStatus
}

export const JobSchemaClass = SchemaFactory.createForClass(JobSchema)