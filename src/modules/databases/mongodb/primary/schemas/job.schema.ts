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
    Schema as MongooseSchema 
} from "mongoose"
import {
    BotSchema 
} from "./bot.schema"
import {
    JobType, GraphQLTypeJobType, GraphQLTypeJobStatus, JobStatus 
} from "../enums"
import {
    PrimaryMongoDbCollectionRef,
} from "../enums"
import {
    TaskSchema, TaskSchemaClass 
} from "./task.schema"
import GraphQLJSON from "graphql-type-json"

/**
 * Represents a job.
 */
@ObjectType({
    description: "Represents a job",
})
@Schema({
    timestamps: true,
    collection: "jobs",
})
export class JobSchema extends AbstractSchema {
    /**
     * The bot that the job is associated with.
     */
    @Field(() => ID,
        {
            description: "Reference to the bot associated with this job" 
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.Bot,
    })
        bot: BotSchema | MongooseSchema.Types.ObjectId

    /**
     * The type of the job.
     */
    @Field(() => GraphQLTypeJobType,
        {
            description: "The type of the job" 
        })
    @Prop({
        type: String, enum: JobType 
    })
        type: JobType

    /**
     * The reason for the job cancellation.
     */
    @Field(() => GraphQLJSON,
        {
            description: "The metadata for the job" 
        })
    @Prop({
        type: MongooseSchema.Types.Mixed, required: false 
    })
        metadata?: unknown

    /**
     * The status of the job.
     */
    @Field(() => GraphQLTypeJobStatus,
        {
            description: "The status of the job" 
        })
    @Prop({
        type: String, enum: JobStatus 
    })
        status: JobStatus

    /**
     * The number of retry attempts of the job.
     */
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

    /**
     * The date and time the job was processed.
     */
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

    /**
     * The date and time the job was started.
     */
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
    /**
     * The tasks of the job.
     */
    @Field(() => [TaskSchema],
        {
            description: "The tasks of the job",
        }
    )
    @Prop({
        type: [TaskSchemaClass], required: true 
    })
        tasks: Array<TaskSchema>
}

export const JobSchemaClass = SchemaFactory.createForClass(JobSchema)