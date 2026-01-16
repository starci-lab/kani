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

    @Field(() => Date, {
        description: "Timestamp when the resource was last refreshed",
    })
    @Prop({ type: Date, required: true })
        lastRefreshedAt: Date

    @Field(() => Number, {
        description: "Total number of refresh executions",
    })
    @Prop({ type: Number, required: true, default: 0 })
        refreshCount: number

    @Field(() => String, { description: "The executor version" })
    @Prop({ type: String, required: true })
        version: string
}

export const ExecutorSchemaClass = SchemaFactory.createForClass(ExecutorSchema)