import {
    Field,
    ObjectType,
} from "@nestjs/graphql"
import {
    Prop,
    Schema,
    SchemaFactory,
} from "@nestjs/mongoose"
import {
    IndicatorName,
    GraphQLTypeIndicatorName,
    Operation,
    GraphQLTypeOperation,
} from "../enums"

/**
 * Represents a single condition (name, op, value) for a bot violate indicator.
 * Typically used as an embedded subdocument.
 */
@ObjectType({
    description: "A condition for a bot violate indicator (name, op, value)",
})
@Schema({
    _id: false,
    autoCreate: false,
})
export class BotViolateIndicatorOpSchema {
    /**
     * The name of the field/indicator to compare.
     */
    @Field(() => GraphQLTypeIndicatorName,
        {
            description: "The name of the field to compare",
        })
    @Prop({
        type: String,
        enum: IndicatorName,
        required: true,
    })
        name: IndicatorName

    /**
     * The comparison operation (eq, gt, gte, lt, lte, ne).
     */
    @Field(() => GraphQLTypeOperation,
        {
            description: "The comparison operation",
        })
    @Prop({
        type: String,
        enum: Operation,
        required: true,
    })
        op: Operation

    /**
     * The value to compare against.
     */
    @Field(() => Number,
        {
            description: "The value to compare against",
        })
    @Prop({
        type: Number,
        required: true,
    })
        value: number
}

export const BotViolateIndicatorOpSchemaClass = SchemaFactory.createForClass(BotViolateIndicatorOpSchema)
