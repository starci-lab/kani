import { Field, ObjectType } from "@nestjs/graphql"
import { AbstractSchema } from "./abstract"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"

@ObjectType({
    description: "Represents a user assigned to an executor",
})
@Schema({
    autoCreate: false,
})
export class AssignedUserSchema extends AbstractSchema {
    @Field(() => String, { description: "The user id" })
    @Prop({ type: String, required: true })
        userId: string
}

export const AssignedUserSchemaClass = SchemaFactory.createForClass(AssignedUserSchema)