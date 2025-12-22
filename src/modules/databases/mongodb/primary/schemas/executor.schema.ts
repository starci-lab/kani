import { Field, ObjectType } from "@nestjs/graphql"
import { AbstractSchema } from "./abstract"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AssignedUserSchema, AssignedUserSchemaClass } from "./assigned-user.schema"

@ObjectType({
    description: "Represents an executor",
})
@Schema({
    timestamps: true,
    collection: "executors",
})
export class ExecutorSchema extends AbstractSchema {
    @Field(() => [AssignedUserSchema], { description: "The assigned users" })
    @Prop({ type: [AssignedUserSchemaClass], required: true })
        assignedUsers: Array<AssignedUserSchema>
    
    @Field(() => Number, { description: "The user count" })
    @Prop({ type: Number, required: true })
        userCount: number
}

export const ExecutorSchemaClass = SchemaFactory.createForClass(ExecutorSchema)