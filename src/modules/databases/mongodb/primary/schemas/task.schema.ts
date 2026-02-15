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
    ObjectType, Field,
    Int
} from "@nestjs/graphql"
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
     * The index of the task.
     */
    @Field(() => Int,
        {
            description: "The index of the task",
        }
    )
    @Prop({
        type: Number, required: true 
    })
        index: number

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
     * The prepare result of the task.
     */
    @Field(
        () => String,
        {
            description: "The prepare result of the task",
            nullable: true,
        }
    )
    @Prop({
        type: String, required: false 
    })
        prepareResult?: string

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

    /**
     * The number of steps in the task.
     */
    @Field(() => Int,
        {
            description: "The number of steps in the task",
        }
    )
    @Prop({
        type: Number, required: true 
    })
        stepCount: number

    /**
     * The status of the task.
     */
    @Field(() => Int,
        {
            description: "The index of the active step",
        }
    )
    @Prop({
        type: Number, required: true 
    })
        activeStep: number

    /**
     * Whether the task is confirmed.
     */
    @Field(() => Boolean,
        {
            description: "The status of the task",
            nullable: true,
        }
    )
    @Prop({
        type: Boolean, required: false 
    })
        confirmed?: boolean  

    /**
     * The index of the open position step.
     */
    @Field(() => Int,
        {
            description: "The index of the open position step",
            nullable: true,
        }
    )
    @Prop({
        type: Number, required: false 
    })
        openPositionStepIndex?: number
}


export const TaskSchemaClass = SchemaFactory.createForClass(TaskSchema)