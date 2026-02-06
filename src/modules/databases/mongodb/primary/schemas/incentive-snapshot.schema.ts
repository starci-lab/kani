import {
    Prop,
    Schema,
    SchemaFactory,
} from "@nestjs/mongoose"
import {
    Field,
    ID,
    ObjectType,
} from "@nestjs/graphql"
import {
    AbstractSchema,
} from "./abstract"
import {
    TokenSchema 
} from "./token.schema"
import {
    PrimaryMongoDbCollectionRef,
} from "../enums"
import {
    Schema as MongooseSchema, Types 
} from "mongoose"

@ObjectType({
    description: "Represents the incentive snapshot",
})
@Schema(
    {
        _id: false,
        autoCreate: false,
    }
)
export class IncentiveSnapshotSchema extends AbstractSchema {
    /**
     * Snapshot of the incentive token address (stringified BN).
     */
    @Field(() => ID,
        {
            description: "The incentive token",
        })
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: PrimaryMongoDbCollectionRef.Token,
        required: true,
    })
        token: TokenSchema | Types.ObjectId

    /**
     * Snapshot of the incentive amount (stringified BN).
     */
    @Field(() => String,
        {
            description: "The incentive amount",
        })
    @Prop({
        type: String,
        required: true,
    })
        amount: string
}

/**
 * The actual Mongoose schema generated from the class definition above.
 * This is what gets registered with the NestJS Mongoose module.
 */
export const IncentiveSnapshotSchemaClass = SchemaFactory.createForClass(IncentiveSnapshotSchema)