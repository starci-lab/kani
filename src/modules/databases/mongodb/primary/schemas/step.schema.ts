import {
    AbstractSchema 
} from "./abstract"
import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    GraphQLTypeStepType,
    StepType 
} from "../enums"
import {
    ObjectType, Field, 
    Int
} from "@nestjs/graphql"

/**
 * Represents a task that needs to be executed by the executor.
 */
@ObjectType({
    description: "Represents a step of a task that needs to be executed by the executor.",
})
@Schema({
    autoCreate: false,
    _id: false,
})
export class StepSchema extends AbstractSchema {
    /**
     * The type of the step.
     */
    @Field(() => GraphQLTypeStepType,
        {
            description: "The type of the step",
        }
    )
    @Prop({
        type: String, 
        required: true, 
        enum: StepType 
    })
        type: StepType
    /**
     * The sign params of the step.
     */
    @Field(
        () => String,
        {
            description: "The sign params of the step",
            nullable: true,
        }
    )
    @Prop({
        type: String, required: false 
    })
        signedTx?: string
    /**
     * The send result of the step.
     */
    @Field(
        () => String,
        {
            description: "The execute result of the step",
            nullable: true,
        }
    )
    @Prop({
        type: String, required: false 
    })
        executeResult?: string

    /**
     * The params of the step.
     */
    @Field(() => String,
        {
            description: "The sign params of the step",
        }
    )
    @Prop({
        type: String 
    })
        prepareTx: string

    /**
     * The index of the step.
     */
    @Field(() => Int,
        {
            description: "The index of the step",
        }
    )
    @Prop({
        type: Number, required: true 
    })
        index: number
}


export const StepSchemaClass = SchemaFactory.createForClass(StepSchema)