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
    LogicalOperator,
    GraphQLTypeLogicalOperator,
} from "../enums"
import {
    BotViolateIndicatorOpSchema,
} from "./bot-violate-indicator-op.schema"

/**
 * A group of indicator conditions combined by a logical operator (AND / OR).
 */
@ObjectType({
    description: "Trigger or reentry threshold: indicators combined by logical operator",
})
@Schema({
    _id: false,
    autoCreate: false,
})
export class BotViolateIndicatorThresholdGroupSchema {
    @Field(() => [BotViolateIndicatorOpSchema],
        {
            description: "The list of indicator conditions",
        })
    @Prop({
        type: [BotViolateIndicatorOpSchema],
        required: true,
    })
        indicators: Array<BotViolateIndicatorOpSchema>

    @Field(() => GraphQLTypeLogicalOperator,
        {
            description: "How to combine the conditions: And (all) or Or (at least one)",
        })
    @Prop({
        type: String,
        enum: LogicalOperator,
        required: true,
    })
        operation: LogicalOperator
}

export const BotViolateIndicatorThresholdGroupSchemaClass =
    SchemaFactory.createForClass(BotViolateIndicatorThresholdGroupSchema)
