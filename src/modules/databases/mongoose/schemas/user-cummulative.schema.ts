import { Field, Float, ObjectType } from "@nestjs/graphql"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"

@Schema({ autoCreate: false })
@ObjectType({ description: "Represents the cumulative capital and PnL of a user" })
export class UserCummulativeSchema {
  @Field(() => Float, { description: "Total cumulative capital the user has allocated" })
  @Prop({ type: Number, required: true, default: 0 })
      cumulativeCapital: number

  @Field(() => Float, { description: "Current profit or loss in absolute value" })
  @Prop({ type: Number, required: true, default: 0 })
      pnl: number

  @Field(() => Float, { description: "Return on investment (ROI) percentage" })
  @Prop({ type: Number, required: true, default: 0 })
      roi: number
}       

export const UserCummulativeSchemaClass = SchemaFactory.createForClass(UserCummulativeSchema)