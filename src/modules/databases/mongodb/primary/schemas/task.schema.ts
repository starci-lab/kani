import {
    AbstractSchema 
} from "./abstract"
import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    GraphQLTypeTaskType,
    TaskType 
} from "../enums"
import {
    Schema as MongooseSchema 
} from "mongoose"
import {
    ObjectType, Field
} from "@nestjs/graphql"
import GraphQLJSON from "graphql-type-json"
import {
    StepSchema, StepSchemaClass 
} from "./step.schema"

/**
 * Represents a task that needs to be executed by the executor.
 */
@ObjectType({
    description: "Represents a task that needs to be executed by the executor.",
})
@Schema({
    autoCreate: false,
    _id: false,
})
export class TaskSchema extends AbstractSchema {
    /**
     * The type of the task.
     */
    @Field(() => GraphQLTypeTaskType,
        {
            description: "The type of the task",
        }
    )
    @Prop({
        type: String, 
        required: true, 
        enum: TaskType 
    })
        type: TaskType

    /**
     * The payload of the task.
     */
    @Field(
        () => GraphQLJSON,
        {
            description: "The payload of the task",
        }
    )
    @Prop({
        type: MongooseSchema.Types.Mixed, required: true 
    })
        payload: unknown

    /**
     * The steps of the task.
     */
    @Field(() => [StepSchema],
        {
            description: "The steps of the task",
        }
    )
    @Prop({
        type: [StepSchemaClass], required: true 
    })
        steps: Array<StepSchema>
}


export const TaskSchemaClass = SchemaFactory.createForClass(TaskSchema)