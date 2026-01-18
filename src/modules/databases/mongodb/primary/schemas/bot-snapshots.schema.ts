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

@ObjectType({
    description: "Represents the snapshots of a bot",
})
@Schema({
    autoCreate: false,
})
export class BotSnapshotsSchema extends AbstractSchema {
    /**
     * Snapshot of the target balance amount (stringified integer/decimal).
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
     * Snapshot of the quote balance amount (stringified integer/decimal).
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
     * Snapshot of the gas balance amount (stringified integer/decimal).
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
        lastBalancesSnapshotAt: Date
}

/**
 * The actual Mongoose schema generated from the class definition above.
 * This is what gets registered with the NestJS Mongoose module.
 */
export const BotSnapshotsSchemaClass = SchemaFactory.createForClass(BotSnapshotsSchema)