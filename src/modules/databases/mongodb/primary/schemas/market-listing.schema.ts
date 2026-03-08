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

/**
 * Represents a token listing on a specific exchange market
 */
@Schema({
    autoCreate: false
})
@ObjectType({
    description: "Represents a token listing on a specific exchange market"
})
export class MarketListingSchema {
    /**
     * Unique identifier of the exchange market
     */
    @Field(() => GraphQLTypeMarketListingId,
        {
            description: "Unique identifier of the exchange market"
        })
    @Prop({
        type: String, required: true, enum: MarketListingId
    })
        id: MarketListingId

    /**
     * Trading symbol used by the market
     */
    @Field(() => String,
        {
            description: "Trading symbol used by the market"
        })
    @Prop({
        type: String, required: true
    })
        symbol: string

    /**
     * Priority of the market
     */
    @Field(() => Int,
        {
            description: "Priority of the market"
        })
    @Prop({
        type: Number, required: true
    })
        priority: number
    
    /**
     * Whether the market is a signal market for volatility detection
     */
    @Field(() => Boolean,
        {
            description: "Whether the market is a signal market for volatility detection"
        })
    @Prop({
        type: Boolean, required: true, default: false
    })
        isSignal: boolean
}

export const MarketListingSchemaClass = SchemaFactory.createForClass(MarketListingSchema)