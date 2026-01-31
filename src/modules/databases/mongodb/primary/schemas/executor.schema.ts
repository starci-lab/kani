import {
    Field, Int, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractSchema 
} from "./abstract"
import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    AssignedBotSchema, AssignedBotSchemaClass 
} from "./assigned-bot.schema"

@ObjectType({
    description: "Represents an executor",
})
@Schema({
    timestamps: true,
    collection: "executors",
})
export class ExecutorSchema extends AbstractSchema {
    @Field(() => [AssignedBotSchema],
        {
            description: "The assigned bots" 
        })
    @Prop({
        type: [AssignedBotSchemaClass], required: true 
    })
        assignedBots: Array<AssignedBotSchema>

    @Field(() => Number,
        {
            description: "The bot count" 
        })
    @Prop({
        type: Number, required: true 
    })
        botCount: number

    @Field(() => Date,
        {
            description: "Timestamp when the resource was last refreshed",
            nullable: true
        })
    @Prop({
        type: Date, required: false 
    })
        lastRefreshedAt?: Date

    @Field(() => Number,
        {
            description: "Total number of refresh executions",
        })
    @Prop({
        type: Number, required: true, default: 0 
    })
        refreshCount: number

    @Field(() => Int,
        {
            description: "The executor version" 
        })
    @Prop({
        type: Number, required: false, default: 0
    })
        version: number
}

export const ExecutorSchemaClass = SchemaFactory.createForClass(ExecutorSchema)