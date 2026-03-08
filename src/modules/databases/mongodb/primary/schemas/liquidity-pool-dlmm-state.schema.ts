import {
    Field,
    ObjectType,
} from "@nestjs/graphql"
import {
    Prop,
    Schema,
    SchemaFactory,
} from "@nestjs/mongoose"

/**
 * DLMM-specific (discrete liquidity) position state.
 *
 * Stored as an embedded subdocument inside `PositionSchema`.
 */
@ObjectType({
    description: "DLMM-specific liquidity pool state",
})
@Schema({
    _id: false,
    autoCreate: false,
})
export class LiquidityPoolDlmmStateSchema {
    @Field(() => Number,
        {
            description: "The bin step of the pool",
            nullable: true,
        })
    @Prop({
        type: Number, nullable: true
    })
        binStep: number

    @Field(() => Number,
        {
            description: "The basis point max of the pool",
            nullable: true,
        })
    @Prop({
        type: Number, nullable: true
    })
        basisPointMax?: number
}

export const LiquidityPoolDlmmStateSchemaClass = SchemaFactory.createForClass(LiquidityPoolDlmmStateSchema)
