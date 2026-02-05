import {
    Field, ID, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractSchema 
} from "./abstract"
import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    Schema as MongooseSchema, Types 
} from "mongoose"
import {
    PrimaryMongoDbCollectionRef,
} from "../ref"
import {
    JobSchema 
} from "./job.schema"
import {
    LiquidityPoolSchema 
} from "./liquidity-pool.schema"
import {
    GraphQLTypeJobType,
    JobType,
} from "../enums"

@ObjectType({
    description: "Represents a bot assigned to an executor",
})
@Schema({
    autoCreate: false,
})
export class ActiveJobSchema extends AbstractSchema {
    @Field(() => ID,
        {
            description: "The job id" 
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.Job,
        required: true,
    })
        job: JobSchema | Types.ObjectId

    @Field(() => ID,
        {
            description: "The liquidity pool id",
            nullable: true,
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.LiquidityPool,
        required: false,
    })
        liquidityPool: LiquidityPoolSchema | Types.ObjectId

    @Field(() => GraphQLTypeJobType,
        {
            description: "The type of the job",
        })
    @Prop({
        type: String,
        enum: JobType,
        required: true,
    })
        jobType: JobType
    /**
     * When the snapshot values were recorded.
     */
    @Field(() => Date,
        {
            description: "The date and time the job was queued",
        })
    @Prop({
        type: Date,
    })
        queuedAt: Date

    @Prop({
        type: String,
        required: false,
    })
        payload?: string
}

export const ActiveJobSchemaClass = SchemaFactory.createForClass(ActiveJobSchema)