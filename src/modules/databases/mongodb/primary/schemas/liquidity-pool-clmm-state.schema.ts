import {
    Field,
    Int,
    ObjectType,
} from "@nestjs/graphql"
import {
    Prop,
    Schema,
    SchemaFactory,
} from "@nestjs/mongoose"

/**
 * CLMM-specific (concentrated liquidity) liquidity pool state.
 *
 * Stored as an embedded subdocument inside `LiquidityPoolSchema`.
 */
@ObjectType({
    description: "CLMM-specific liquidity pool state",
})
@Schema({
    _id: false,
    autoCreate: false,
})
export class LiquidityPoolClmmStateSchema {
    @Field(() => Number,
        {
            description: "The tick spacing of the pool",
            nullable: true,
        })
    @Prop({
        type: Number, nullable: true
    })
        tickSpacing: number

    @Field(() => Int,
        {
            description: "The tick spacing multiplier of the pool"
        })
    @Prop({
        type: Number, default: 1
    })
        tickMultiplier: number

}

export const LiquidityPoolClmmStateSchemaClass = SchemaFactory.createForClass(LiquidityPoolClmmStateSchema)
