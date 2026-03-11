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
    BotViolateIndicatorThresholdGroupSchema,
} from "./bot-violate-indicator-threshold-group.schema"

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
     * The trigger threshold: indicators combined by logical operator (And / Or).
     */
    @Field(() => BotViolateIndicatorThresholdGroupSchema,
        {
            description: "The trigger threshold of the bot violate indicator",
        })
    @Prop({
        type: BotViolateIndicatorThresholdGroupSchema,
        required: true,
    })
    triggerThresholds: BotViolateIndicatorThresholdGroupSchema

    /**
     * The reentry threshold: indicators combined by logical operator (And / Or).
     */
    @Field(() => BotViolateIndicatorThresholdGroupSchema,
        {
            description: "The reentry threshold of the bot violate indicator",
        })
    @Prop({
        type: BotViolateIndicatorThresholdGroupSchema,
        required: true,
    })
    reentryThresholds: BotViolateIndicatorThresholdGroupSchema

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