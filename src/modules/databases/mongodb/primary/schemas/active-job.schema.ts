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

    /**
     * When the snapshot values were recorded.
     */
    @Field(() => Date,
        {
            description: "The date and time the job was queued",
        })
    @Prop({
        type: Date,
        required: true,
    })
        queuedAt: Date
}

export const ActiveJobSchemaClass = SchemaFactory.createForClass(ActiveJobSchema)