import {
    AbstractSchema, 
    GraphQLTypePositionSettlementReason, 
    PositionSettlementReason 
} from "@modules/databases"
import {
    Field, ObjectType 
} from "@nestjs/graphql"
import {
    Prop, Schema, 
    SchemaFactory
} from "@nestjs/mongoose"
import GraphQLJSON from "graphql-type-json"

@ObjectType()
@Schema({
    autoCreate: false,
})
export class PositionSettlementSchema extends AbstractSchema {
    @Field(() => GraphQLTypePositionSettlementReason,
        {
            description: "The reason for the settlement"
        })
    @Prop({
        type: String, enum: PositionSettlementReason
    })
        reason: PositionSettlementReason

    @Field(() => GraphQLJSON,
        {
            description: "The metadata for the settlement"
        })
    @Prop({
        type: GraphQLJSON
    })
        metadata: unknown
}

export interface PositionSettlementReasonExitOutOfRangeMetadata {
    tickAtClose: number
}

export const PositionSettlementSchemaClass = SchemaFactory.createForClass(PositionSettlementSchema)