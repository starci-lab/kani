import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    AbstractSchema 
} from "./abstract"
import {
    Field, ID, Int, ObjectType 
} from "@nestjs/graphql"
import {
    LiquidityPoolSchema 
} from "./liquidity-pool.schema"
import {
    Schema as MongooseSchema 
} from "mongoose"
import {
    BotSchema 
} from "./bot.schema"
import {
    JobType, GraphQLTypeJobType, GraphQLTypeJobStatus, JobStatus 
} from "../enums"
import {
    ExecutorSchema 
} from "./executor.schema"

import {
    Types 
} from "mongoose"
import {
    PrimaryMongoDbCollectionRef,
} from "../ref"

@ObjectType({
    description: "Represents a job",
})
@Schema({
    timestamps: true,
    collection: "jobs",
})
export class JobSchema extends AbstractSchema {
    @Field(() => ID,
        {
            description: "Reference to the liquidity pool associated with this job", nullable: true 
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.LiquidityPool,
        required: false,
    })
        liquidityPool?: LiquidityPoolSchema | MongooseSchema.Types.ObjectId

    @Field(() => ID,
        {
            description: "Reference to the bot associated with this job" 
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.Bot,
    })
        bot: BotSchema | MongooseSchema.Types.ObjectId

    @Field(() => ID,
        {
            description: "Reference to the executor associated with this job", nullable: true 
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.Executor,
        required: false,
    })
        executor?: ExecutorSchema | Types.ObjectId

    @Field(() => GraphQLTypeJobType,
        {
            description: "The type of the job" 
        })
    @Prop({
        type: String, enum: JobType 
    })
        type: JobType

    @Field(() => GraphQLTypeJobStatus,
        {
            description: "The status of the job" 
        })
    @Prop({
        type: String, enum: JobStatus 
    })
        status: JobStatus

    @Field(() => String,
        {
            description: "The transaction hash of the job" 
        })
    @Prop({
        type: String, required: false 
    })
        txHash?: string

    @Prop({
        type: MongooseSchema.Types.Mixed, required: false 
    })
        data?: unknown

    @Field(
        () => Int, 
        { 
            description: "The number of retry attempts of the job",
            defaultValue: 0
        }
    )
    @Prop({
        type: Number, default: 0 
    })
        retryCount: number

    @Field(
        () => Date, 
        { 
            description: "The date and time the job was processed",
            nullable: true
        }
    )
    @Prop({
        type: Date, required: false 
    })
        processedAt?: Date

    @Field(
        () => Date, 
        { 
            description: "The date and time the job was started",
            nullable: true
        }
    )
    @Prop({
        type: Date, required: false 
    })
        startedAt?: Date
}

export const JobSchemaClass = SchemaFactory.createForClass(JobSchema)

// get the order of the job status
export const getJobStatusOrder = (status: JobStatus): number => {
    switch (status) {
    case JobStatus.Pending: return 0
    case JobStatus.Prepared: return 1
    case JobStatus.Executed: return 2
    case JobStatus.Confirmed: return 3
    case JobStatus.Completed: return 4
    case JobStatus.Failed: return 0
    }
}