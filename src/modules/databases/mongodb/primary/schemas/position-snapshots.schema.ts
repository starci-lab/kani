import {
    Prop,
    Schema,
    SchemaFactory,
} from "@nestjs/mongoose"
import {
    Field,
    Float,
    ObjectType,
} from "@nestjs/graphql"
import {
    AbstractSchema,
} from "./abstract"

@ObjectType({
    description: "Represents the position's snapshots",
})
@Schema({
    _id: false,
    autoCreate: false,
})
export class PositionSnapshotsSchema extends AbstractSchema {
    /**
     * Snapshot of the target balance amount (stringified BN).
     */
    @Field(() => String,
        {
            description: "The snapshot of the target balance amount",
        })
    @Prop({
        type: String,
        required: true,
    })
        targetBalanceAmount: string

    /**
     * Snapshot of the quote balance amount (stringified BN).
     */
    @Field(() => String,
        {
            description: "The snapshot of the quote balance amount",
        })
    @Prop({
        type: String,
        required: true,
    })
        quoteBalanceAmount: string

    /**
     * Snapshot of the gas balance amount (stringified BN).
     */
    @Field(() => String,
        {
            description: "The snapshot of the gas balance amount",
        })
    @Prop({
        type: String,
        required: true,
    })
        gasBalanceAmount: string

    /**
     * When the snapshot values were recorded.
     */
    @Field(() => Date,
        {
            description: "The date and time the snapshots were taken",
        })
    @Prop({
        type: Date,
        required: true,
    })
        snapshotAt: Date

    /**
     * Position value in the target token at the time of snapshot
     */
    @Field(() => Float,
        {
            description: "The value of the position in the target token at the time of snapshot",
        })
    @Prop({
        type: Number,
    })
        positionValue: number

    /**
     * Position value in USD at the time of snapshot
     */
    @Field(() => Float,
        {
            description: "The value of the position in USD at the time of snapshot",
        })
    @Prop({
        type: Number,
    })
        positionValueInUsd: number
}

/**
 * The actual Mongoose schema generated from the class definition above.
 * This is what gets registered with the NestJS Mongoose module.
 */
export const PositionSnapshotsSchemaClass = SchemaFactory.createForClass(PositionSnapshotsSchema)