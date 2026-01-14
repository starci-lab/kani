import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Field, Int, ObjectType } from "@nestjs/graphql"
import { MarketId } from "../enums"
import { GraphQLTypeMarketId } from "../enums"

@Schema({ autoCreate: false })
@ObjectType({ description: "Represents a token listing on a specific exchange market" })
export class MarketListingSchema {
  @Field(() => GraphQLTypeMarketId, {
      description: "Unique identifier of the exchange market"
  })
  @Prop({ type: String, required: true, enum: MarketId })
      id: MarketId

  @Field(() => String, {
      description: "Trading symbol used by the market"
  })
  @Prop({ type: String, required: true })
      symbol: string

  @Field(() => Int, {
      description: "Priority of the market"
  })
  @Prop({ type: Number, required: true })
      priority: number
}

export const MarketListingSchemaClass = SchemaFactory.createForClass(MarketListingSchema)