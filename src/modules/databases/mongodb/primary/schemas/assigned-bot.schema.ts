import {
    Field, ID, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractSchema 
} from "./abstract"
import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    BotSchema 
} from "./bot.schema"
import {
    Schema as MongooseSchema, Types 
} from "mongoose"

@ObjectType({
    description: "Represents a bot assigned to an executor",
})
@Schema({
    autoCreate: false,
})
export class AssignedBotSchema extends AbstractSchema {
    @Field(() => ID,
        {
            description: "The bot id" 
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId, ref: BotSchema.name, required: true 
    })
        bot: BotSchema | Types.ObjectId
}

export const AssignedBotSchemaClass = SchemaFactory.createForClass(AssignedBotSchema)