import {
    Prop,
    Schema,
    SchemaFactory,
} from "@nestjs/mongoose"
import {
    Field,
    ObjectType,
} from "@nestjs/graphql"
import {
    ChartInterval,
    ChartUnit,
    GraphQLTypeChartInterval,
    GraphQLTypeChartUnit,
} from "@modules/databases"

@ObjectType({
    description: "Represents the bot's chart configuration",
})
@Schema({
    _id: false,
    autoCreate: false,
})
export class BotChartConfigSchema {
    @Field(() => GraphQLTypeChartUnit,
        {
            description: "The unit of the chart",
            nullable: true,
        })
    @Prop({
        type: String,
        enum: ChartUnit,
        required: true,
    })
        chartUnit: ChartUnit

    @Field(() => GraphQLTypeChartInterval,
        {
            description: "The interval of the chart",
            nullable: true,
        })
    @Prop({
        type: String,
        enum: ChartInterval,
        required: true,
    })
        chartInterval: ChartInterval
}

export const BotChartConfigSchemaClass = SchemaFactory.createForClass(BotChartConfigSchema)
