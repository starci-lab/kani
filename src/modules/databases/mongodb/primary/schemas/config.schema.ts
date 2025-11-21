import { AbstractSchema } from "./abstract"
import { Field, ObjectType } from "@nestjs/graphql"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { ConfigId, GraphQLTypeConfigId } from "../enums"
import { GraphQLJSON } from "graphql-type-json"
import { Schema as MongooseSchema } from "mongoose"
import { ChainId, Network } from "@modules/common"

@ObjectType({
    description: "Represents a configuration for the platform.",
})
@Schema({
    timestamps: true,
    collection: "configs",
})
export class ConfigSchema extends AbstractSchema {
    @Field(() => GraphQLTypeConfigId, {
        description: "The id of the config.",
    })
    @Prop({ type: String, required: true, enum: ConfigId })
        displayId: ConfigId

    @Field(() => GraphQLJSON, {
        description: "The value of the config (can be object, array, or primitive).",
    })
    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
        value: Record<string, unknown>
}

export const ConfigSchemaClass = SchemaFactory.createForClass(ConfigSchema)

@ObjectType({
    description: "Represents the gas configuration for the platform.",
})
export class GasConfig {
    @Field(() => GraphQLJSON, {
        description: "The minimum gas required to process a transaction.",
    })
        gasAmountRequired: Partial<Record<ChainId, Partial<Record<Network, GasAmountRequired>>>>
}

@ObjectType({
    description: "Represents the gas thresholds required for the bot’s operation.",
})
export class GasAmountRequired {
    @Field(() => String, {
        description: "The minimum operational gas amount required for the bot to function.",
    })
    @Prop({ type: String, required: true })
        minOperationalAmount: string

    @Field(() => String, {
        description: "The target gas amount the bot aims to maintain during normal operation.",
    })
    @Prop({ type: String, required: true })
        targetOperationalAmount: string
}