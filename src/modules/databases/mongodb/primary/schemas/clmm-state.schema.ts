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
 * CLMM-specific (concentrated liquidity) position state.
 *
 * Stored as an embedded subdocument inside `PositionSchema`.
 */
@ObjectType({
    description: "CLMM-specific position state",
})
@Schema({
    _id: false,
    autoCreate: false,
})
export class ClmmStateSchema {
    /**
     * On-chain liquidity minted for this CLMM position (optional).
     * Stored as string to preserve precision.
     */
    @Field(() => String,
        {
            description: "On-chain liquidity minted for this CLMM position",
        })
    @Prop({
        type: String,
        required: true,
    })
        liquidity: string
    /**
     * Lower tick boundary of the CLMM position's price range (optional).
     */
    @Field(() => Int,
        {
            description: "Lower tick boundary of the CLMM position's price range",
        })
    @Prop({
        type: Number,
        required: true,
    })
        tickLower: number
    /**
     * Upper tick boundary of the CLMM position's price range (optional).
     */
    @Field(() => Int,
        {
            description: "Upper tick boundary of the CLMM position's price range",
        }
    )
    @Prop({
        type: Number,
        required: true,
    })
        tickUpper: number
}

export const ClmmStateSchemaClass = SchemaFactory.createForClass(ClmmStateSchema)
