import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { Schema as MongooseSchema, Types } from "mongoose"
import { Field, Float, ID, ObjectType } from "@nestjs/graphql"
import { LiquidityPoolSchema } from "./liquidity-pool.schema"

@Schema({
    timestamps: true,
    collection: "dynamic_liquidity_pool_infos",
})
@ObjectType({ description: "Represents a liquidity pool between two tokens on a specific DEX" })
export class DynamicLiquidityPoolInfoSchema extends AbstractSchema {
    @Field(() => ID, { description: "The liquidity pool this info belongs to" })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: LiquidityPoolSchema.name })
        liquidityPool: LiquidityPoolSchema | Types.ObjectId

    @Field(() => Float, { description: "The current tick" })
    @Prop({ type: Number })
        tickCurrent: number

    @Field(() => Float, { description: "The liquidity" })
    @Prop({ type: Number })
        liquidity: number

    @Field(() => Float, { description: "The sqrt price" })
    @Prop({ type: Number })
        sqrtPriceX64: number
}

export const DynamicLiquidityPoolInfoSchemaClass = SchemaFactory.createForClass(DynamicLiquidityPoolInfoSchema)