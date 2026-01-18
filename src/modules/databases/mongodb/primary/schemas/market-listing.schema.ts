import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    Field, Int, ObjectType 
} from "@nestjs/graphql"
import {
    MarketListingId 
} from "../enums"
import {
    GraphQLTypeMarketListingId 
} from "../enums"

@Schema({
    autoCreate: false 
})
@ObjectType({
    description: "Represents a token listing on a specific exchange market" 
})
export class MarketListingSchema {
  @Field(() => GraphQLTypeMarketListingId,
      {
          description: "Unique identifier of the exchange market"
      })
  @Prop({
      type: String, required: true, enum: MarketListingId 
  })
      id: MarketListingId

  @Field(() => String,
      {
          description: "Trading symbol used by the market"
      })
  @Prop({
      type: String, required: true 
  })
      symbol: string

  @Field(() => Int,
      {
          description: "Priority of the market"
      })
  @Prop({
      type: Number, required: true 
  })
      priority: number
}

export const MarketListingSchemaClass = SchemaFactory.createForClass(MarketListingSchema)