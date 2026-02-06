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
    Types 
} from "mongoose"
import {
    PrimaryMongoDbCollectionRef,
} from "../enums"

@ObjectType({
    description: "Represents a history serie" 
})
@Schema({
    autoCreate: false 
})
export class HistorySerieSchema {
    @Field(() => Date,
        {
            description: "The date and time the position was closed (close snapshot timestamp)" 
        })
    @Prop({
        type: Date, required: true 
    })
        closedAt: Date

    @Field(() => Number,
        {
            description: "The position value at close (close snapshot position value)" 
        })
    @Prop({
        type: Number, required: true 
    })
        valueAtClose: number

    @Field(() => Number,
        {
            description: "The position value in USD at close (close snapshot position value in USD)" 
        })
    @Prop({
        type: Number, required: true 
    })
        valueInUsdAtClose: number
}
export const HistorySerieSchemaClass = SchemaFactory.createForClass(HistorySerieSchema)

@Schema({
    timestamps: true,
    collection: "histories",
})
export class HistorySchema extends AbstractSchema {
    @Prop({
        type: [HistorySerieSchemaClass], required: true 
    })
        series: Array<HistorySerieSchema>

    @Prop({
        type: Date, required: true 
    })
        lastSeriesUpdatedAt: Date

    @Prop({
        type: Number, required: true 
    })
        seriesCount: number

    @Field(() => ID,
        {
            description: "Reference to the bot that created this position" 
        })
    @Prop({
        type: Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.Bot,
    })
        bot: BotSchema | Types.ObjectId    
}

export const HistorySchemaClass = SchemaFactory.createForClass(HistorySchema)