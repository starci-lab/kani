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
    Schema as MongooseSchema 
} from "mongoose"
import {
    ObjectType, Field, Int 
} from "@nestjs/graphql"
import GraphQLJSON from "graphql-type-json"

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
     * The data of the step.
     */
    @Field(
        () => GraphQLJSON,
        {
            description: "The data of the step",
        }
    )
    @Prop({
        type: MongooseSchema.Types.Mixed, required: true 
    })
        data: unknown

    /**
     * The status of the step.
     */
    @Field(
        () => Int,
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