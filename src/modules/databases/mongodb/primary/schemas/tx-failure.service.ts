import {
    Prop,
    Schema,
    SchemaFactory,
} from "@nestjs/mongoose"
import {
    Field,
    ObjectType,
} from "@nestjs/graphql"
import {
    AbstractSchema,
} from "./abstract"

@ObjectType({
    description: "Represents the transaction failure reason",
})
@Schema({
    _id: false,
    autoCreate: false,
})
export class TxFailureSchema extends AbstractSchema {
    /**
     * The index of the task that the job is currently processing.
     */
    @Field(() => String,
        {
            description: "The index of the task that the job is currently processing",
        })
    @Prop({
        type: String,
        required: true,
    })
        index: string

    /**
     * The error message.
     */
    @Field(() => String,
        {
            description: "The error message",
        })
    @Prop({
        type: String,
        required: true,
    })
        errorMessage: string

    /**
    * The error message.
    */
    @Field(() => String,
        {
            description: "The stack trace",
        })
    @Prop({
        type: String,
        required: true,
    })
        stackTrace: string
}

/**
 * The actual Mongoose schema generated from the class definition above.
 * This is what gets registered with the NestJS Mongoose module.
 */
export const TxFailureSchemaClass = SchemaFactory.createForClass(TxFailureSchema)