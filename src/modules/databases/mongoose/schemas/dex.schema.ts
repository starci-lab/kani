import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { DexId, GraphQLTypeDexId } from "../enums"
import { Field } from "@nestjs/graphql"

@Schema({
    timestamps: true,
    collection: "dexes",
})
export class DexSchema extends AbstractSchema {
    @Field(() => GraphQLTypeDexId)
    @Prop({
        unique: true,
        type: String,
        required: true,
        enum: DexId,
    })
        displayId: DexId

    @Field(() => String)
    @Prop({
        type: String,
        required: true,
    })
        name: string

    @Field(() => String, {
        nullable: true,
    })
    @Prop({
        type: String,
        required: false,
    })
        description?: string

    @Field(() => String, {
        nullable: true,
    })
    @Prop({
        type: String,
        required: false,
    })
        website?: string

    @Field(() => String, {
        nullable: true,
    })
    @Prop({
        type: String,
        required: false,
    })
        iconUrl?: string
}

export const DexSchemaClass = SchemaFactory.createForClass(DexSchema)