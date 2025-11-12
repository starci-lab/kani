import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Field, ObjectType, ID, Float } from "@nestjs/graphql"

@Schema({ collection: "positions", timestamps: true })
@ObjectType()
export class PositionSchema {
    @Field(() => ID)
        _id: string

    @Field(() => String)
    @Prop({ type: String, required: true })
        liquidityPoolId: string

    // When opening position
    @Field(() => Float)
    @Prop({ type: String, required: true }) // Decimal lưu dạng string
        amountOpen: string

    @Field(() => Float, { nullable: true })
    @Prop({ type: String, required: false })
        amountClose?: string

    @Field(() => String)
    @Prop({ type: String, required: true })
        openTxHash: string

    @Field(() => String)
    @Prop({ type: String, required: true })
        openBlockNumber: string

    @Field(() => String, { nullable: true })
    @Prop({ type: String, required: false })
        closeTxHash?: string

    @Field(() => String, { nullable: true })
    @Prop({ type: String, required: false })
        closeBlockNumber?: string

    @Field(() => Float, { nullable: true })
    @Prop({ type: String, required: false })
        roi?: string
}

export const PositionSchemaClass = SchemaFactory.createForClass(PositionSchema)