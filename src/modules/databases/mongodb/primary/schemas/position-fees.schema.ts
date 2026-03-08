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
 * Fee amounts for a position, normalized to target/quote token perspective.
 *
 * Stored as an embedded subdocument inside `PositionSchema`.
 */
@ObjectType({
    description: "Fee amounts for a position",
})
@Schema({
    _id: false,
    autoCreate: false,
})
export class PositionFeesSchema {
    /**
     * Fees paid in the target token for opening/closing this position.
     * Stored as string to preserve precision.
     */
    @Field(() => String,
        {
            description: "The amount of target tokens paid as fees for the position",
        })
    @Prop({
        type: String,
        required: true,
    })
        targetAmount: string

    /**
     * Fees paid in the quote token for opening/closing this position.
     * Stored as string to preserve precision.
     */
    @Field(() => String,
        {
            description: "The amount of quote tokens paid as fees for the position",
        })
    @Prop({
        type: String,
        required: true,
    })
        quoteAmount: string

    /**
     * The transaction hashes that transferred the fees to the fee address after the position is closed.
     */
    @Field(() => [String],
        {
            description: "The transaction hashes that transferred the fees to the fee address after the position is closed",
        })
    @Prop({
        type: [String],
        required: false,
    })
        feeTransferTxHashes?: Array<string>
}

export const PositionFeesSchemaClass = SchemaFactory.createForClass(PositionFeesSchema)

