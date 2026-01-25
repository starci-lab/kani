import {
    Field,
    Float,
    ObjectType,
} from "@nestjs/graphql"
import {
    Prop,
    Schema,
    SchemaFactory,
} from "@nestjs/mongoose"

/**
 * Performance metrics for a position, computed from open and close snapshots.
 *
 * Stored as an embedded subdocument inside `PositionSchema`.
 */
@ObjectType({
    description: "Performance metrics for a position",
})
@Schema({
    _id: false,
    autoCreate: false,
})
export class PositionPerformanceSchema {
    /**
     * Return on investment (ROI) percentage.
     * Computed as: (closeValue - openValue) / openValue * 100
     */
    @Field(() => Float,
        {
            description: "The return on investment (ROI) percentage of the position",
        })
    @Prop({
        type: Number,
        required: true,
    })
        roi: number

    /**
     * Profit and loss (PnL) in token units.
     * Computed as: closeValue - openValue
     */
    @Field(() => Float,
        {
            description: "The profit or loss in token units of the position",
        })
    @Prop({
        type: Number,
        required: true,
    })
        pnl: number

    /**
     * Return on investment (ROI) percentage in USD.
     * Computed as: (closeValueUsd - openValueUsd) / openValueUsd * 100
     */
    @Field(() => Float,
        {
            description: "The return on investment (ROI) percentage in USD of the position",
        })
    @Prop({
        type: Number,
        required: true,
    })
        roiUsd: number

    /**
     * Profit and loss (PnL) in USD.
     * Computed as: closeValueUsd - openValueUsd
     */
    @Field(() => Float,
        {
            description: "The profit or loss in USD of the position",
        })
    @Prop({
        type: Number,
        required: true,
    })
        pnlUsd: number
}

export const PositionPerformanceSchemaClass = SchemaFactory.createForClass(PositionPerformanceSchema)
