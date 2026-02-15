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
    timestamps: true,
})
export class TxFailureSchema extends AbstractSchema {
    /**
     * The error message.
     */
    @Field(() => String,
        {
            description: "The error message",
        })
    @Prop(
        {
            type: String,
            required: true,
        }
    )
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

    /**
     * The number of retries of the step.
     */
    @Field(() => Date,
        {
            description: "The date and time the tx failure was recorded",
        }
    )
    @Prop({
        type: Date
    })
        snapshotAt: Date
}

/**
 * The actual Mongoose schema generated from the class definition above.
 * This is what gets registered with the NestJS Mongoose module.
 */
export const TxFailureSchemaClass = SchemaFactory.createForClass(TxFailureSchema)