import {
    Prop,
    Schema,
    SchemaFactory,
} from "@nestjs/mongoose"
import {
    Field,
    ObjectType,
} from "@nestjs/graphql"
import {
    AbstractSchema,
} from "./abstract"
import {
    IncentiveSnapshotSchema, IncentiveSnapshotSchemaClass 
} from "./incentive-snapshot.schema"

@ObjectType({
    description: "Represents the bot's snapshots",
})
@Schema({
    _id: false,
    autoCreate: false,
})
export class BotSnapshotsSchema extends AbstractSchema {
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
     * Snapshot of the incentive token addresses (stringified BN).
     */
    @Field(() => [IncentiveSnapshotSchema],
        {
            description: "The snapshot of the incentive token addresses",
        })
    @Prop({
        type: [IncentiveSnapshotSchemaClass],
        required: true,
    })
        incentiveSnapshots: Array<IncentiveSnapshotSchema>

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
}

/**
 * The actual Mongoose schema generated from the class definition above.
 * This is what gets registered with the NestJS Mongoose module.
 */
export const BotSnapshotsSchemaClass = SchemaFactory.createForClass(BotSnapshotsSchema)