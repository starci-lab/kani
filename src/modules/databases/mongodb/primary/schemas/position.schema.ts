import { Field } from "@nestjs/graphql"
import { Prop, Schema } from "@nestjs/mongoose"
import { LiquidityPoolSchema } from "./liquidity-pool.schema"
import { SchemaFactory } from "@nestjs/mongoose"
import { Schema as MongooseSchema } from "mongoose"
import { ObjectType } from "@nestjs/graphql"
import { AbstractSchema } from "./abstract"
import { ID } from "@nestjs/graphql"

@Schema({ collection: "positions", timestamps: true })
@ObjectType()
export class PositionSchema extends AbstractSchema {
    @Field(() => String, { description: "Transaction hash of the position opening" })
    @Prop({
        unique: true,
        type: String,
        required: true,
    })
        openTxHash: string

    @Field(() => ID, { description: "Liquidity pool where this position is opened" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: LiquidityPoolSchema.name })
        liquidityPool: LiquidityPoolSchema | MongooseSchema.Types.ObjectId

    @Field(() => String, { description: "Amount of target tokens supplied when opening the position" })
    @Prop({ type: String, required: true })
        targetAmountIn: string

    @Field(() => String, { description: "Amount of quote tokens supplied when opening the position" })
    @Prop({ type: String, required: true })
        quoteAmountIn: string

    @Field(() => String, { description: "Gas tokens spent during the position opening process" })
    @Prop({ type: String })
        gasUsed?: string
}

export const PositionSchemaClass = SchemaFactory.createForClass(PositionSchema)