import {
    Prop, Schema, SchemaFactory
} from "@nestjs/mongoose"
import {
    AbstractSchema
} from "./abstract"
import {
    BotViolateIndicatorType,
    GraphQLTypeBotViolateIndicatorType
} from "../enums"
import {
    Field, Int, ObjectType
} from "@nestjs/graphql"
import { 
    BotViolateIndicatorOpSchema 
} from "./bot-violate-indicator-op.schema"

/**
 * Represents a decentralized exchange (DEX) supported by the platform.
 * Each DEX entry contains metadata used for routing, display, and integrations.
 */
@ObjectType({
    description: "Represents a bot violate indicator"
})
@Schema(
    {
        autoCreate: false,
    }
)
export class BotViolateIndicatorSchema extends AbstractSchema {
    /**
     * The name of the bot violate indicator.
     */
    @Field(() => String,
        {
            description: "The name of the bot violate indicator",
        })
    @Prop({
        type: String,
        required: true,
    })
    name: string
    /**
     * The type of the bot violate indicator.
     */
    @Field(() => GraphQLTypeBotViolateIndicatorType,
        {
            description: "The type of the bot violate indicator",
        })
    @Prop({
        type: String,
        enum: BotViolateIndicatorType,
        required: true,
    })
    type: BotViolateIndicatorType

    /**
     * The threshold of the bot violate indicator.
     */
    @Field(() => [BotViolateIndicatorOpSchema],
        {
            description: "The trigger thresholds of the bot violate indicator",
        })
    @Prop({
        type: [BotViolateIndicatorOpSchema],
        required: true,
    })
    triggerThresholds: Array<BotViolateIndicatorOpSchema>

    /**
     * The emergency exit thresholds of the bot violate indicator.
     */
    @Field(() => [BotViolateIndicatorOpSchema],
        {
            description: "The emergency exit thresholds of the bot violate indicator",
        })
    @Prop({
        type: [BotViolateIndicatorOpSchema],
        required: true,
    })
    emergencyExitThresholds: Array<BotViolateIndicatorOpSchema>

    /**
     * The reentry thresholds of the bot violate indicator.
     */
    @Field(() => [BotViolateIndicatorOpSchema],
        {
            description: "The reentry thresholds of the bot violate indicator",
        })
    @Prop({
        type: [BotViolateIndicatorOpSchema],
        required: true,
    })
    reentryThresholds: Array<BotViolateIndicatorOpSchema>

    /**
     * The metadata of the bot violate indicator.
     */
    @Field(() => Int,
        {
            description: "The time window in milliseconds",
        })
    @Prop({
        type: Number,
        required: true,
    })
    timeWindowMs: number
}

export const BotViolateIndicatorSchemaClass = SchemaFactory.createForClass(BotViolateIndicatorSchema)