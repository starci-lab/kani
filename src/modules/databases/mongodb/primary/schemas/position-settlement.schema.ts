import {
    GraphQLTypePositionSettlementReason, 
    PositionSettlementReason 
} from "../enums"
import {
    AbstractSchema,
} from "./abstract"
import {
    Field, ObjectType 
} from "@nestjs/graphql"
import {
    Prop, Schema, 
    SchemaFactory
} from "@nestjs/mongoose"
import GraphQLJSON from "graphql-type-json"
import {
    Schema as MongooseSchema 
} from "mongoose"

@ObjectType()
@Schema({
    autoCreate: false,
})
export class PositionSettlementSchema extends AbstractSchema {
    @Field(() => GraphQLTypePositionSettlementReason,
        {
            description: "The reason for the settlement"
        }
    )
    @Prop(
        {
            type: String, enum: PositionSettlementReason
        }
    )
        reason: PositionSettlementReason

    @Field(() => GraphQLJSON,
        {
            description: "The metadata for the settlement"
        }
    )
    @Prop({
        type: MongooseSchema.Types.Mixed
    })
        metadata?: unknown
}

export interface PositionSettlementReasonOutOfRangeMetadata {
    tickAtClose: number
}

export const PositionSettlementSchemaClass = SchemaFactory.createForClass(PositionSettlementSchema)