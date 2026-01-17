import { Field, ObjectType } from "@nestjs/graphql"
import { AbstractSchema } from "./abstract"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"

@ObjectType({
    description: "Represents a bot assigned to an executor",
})
@Schema({
    autoCreate: false,
})
export class AssignedBotSchema extends AbstractSchema {
    @Field(() => String, { description: "The bot id" })
    @Prop({ type: String, required: true })
        botId: string
}

export const AssignedBotSchemaClass = SchemaFactory.createForClass(AssignedBotSchema)