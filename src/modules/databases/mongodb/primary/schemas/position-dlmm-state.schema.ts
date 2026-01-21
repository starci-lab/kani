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
 * DLMM-specific (discrete liquidity) position state.
 *
 * Stored as an embedded subdocument inside `PositionSchema`.
 */
@ObjectType({
    description: "DLMM-specific position state",
})
@Schema({
    _id: false,
    autoCreate: false,
})
export class PositionDlmmStateSchema {
    /**
     * Lower bin id boundary of the DLMM position's price range.
     */
    @Field(() => Int,
        {
            description: "Lower bin id boundary of the DLMM position's price range",
        })
    @Prop({
        type: Number,
        required: true,
    })
        minBinId: number

    /**
     * Upper bin id boundary of the DLMM position's price range (optional).
     */
    @Field(() => Int,
        {
            description: "Upper bin id boundary of the DLMM position's price range",
        })
    @Prop({
        type: Number,
        required: true,
    })
        maxBinId: number
}

export const PositionDlmmStateSchemaClass = SchemaFactory.createForClass(PositionDlmmStateSchema)
