import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { DexId, GraphQLTypeDexId } from "../enums"
import { Field, ObjectType } from "@nestjs/graphql"

/**
 * Represents a decentralized exchange (DEX) supported by the platform.
 * Each DEX entry contains metadata used for routing, display, and integrations.
 */
@ObjectType({
    description: "Represents a decentralized exchange with metadata such as ID, name, description, website, and icon URL."
})
@Schema({
    timestamps: true,
    collection: "dexes",
})
export class DexSchema extends AbstractSchema {
    @Field(() => GraphQLTypeDexId, {
        description: "Unique identifier of the DEX, mapped from the internal DexId enum.",
    })
    @Prop({
        unique: true,
        type: String,
        required: true,
        enum: DexId,
    })
        displayId: DexId

    @Field(() => String, {
        description: "The official name of the DEX (e.g. Cetus, Turbos, Uniswap).",
    })
    @Prop({
        type: String,
        required: true,
    })
        name: string

    @Field(() => String, {
        nullable: true,
        description: "A short description of the DEX, including its purpose or key features.",
    })
    @Prop({
        type: String,
        required: false,
    })
        description?: string

    @Field(() => String, {
        nullable: true,
        description: "The official website URL of the DEX.",
    })
    @Prop({
        type: String,
        required: false,
    })
        website?: string

    @Field(() => String, {
        nullable: true,
        description: "The icon URL of the DEX, used for displaying logos in the UI.",
    })
    @Prop({
        type: String,
        required: false,
    })
        iconUrl?: string
}

export const DexSchemaClass = SchemaFactory.createForClass(DexSchema)