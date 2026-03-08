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
    Field, ObjectType 
} from "@nestjs/graphql"
import GraphQLJSON from "graphql-type-json"
import {
    Schema as MongooseSchema 
} from "mongoose"

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
    @Field(() => GraphQLJSON,
        {
            description: "The threshold of the bot violate indicator",
        })
    @Prop({
        type: MongooseSchema.Types.Mixed,
        required: true,
    })
        threshold: unknown

    /**
     * The metadata of the bot violate indicator.
     */
    @Field(() => GraphQLJSON,
        {
            description: "The metadata of the bot violate indicator",
        })
    @Prop({
        type: MongooseSchema.Types.Mixed,
        required: true,
    })
        metadata: unknown
}

export const BotViolateIndicatorSchemaClass = SchemaFactory.createForClass(BotViolateIndicatorSchema)