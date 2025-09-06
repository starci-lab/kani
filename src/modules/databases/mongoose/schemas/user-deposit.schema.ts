import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Field, Float, ObjectType } from "@nestjs/graphql"

@Schema({ autoCreate: false })
@ObjectType({ description: "Represents a deposit transaction from a user into an instance" })
export class UserDepositSchema {
    @Field(() => Float, { description: "Deposit amount" })
    @Prop({ type: Number, required: true })
        depositAmount: number
}

export const UserDepositSchemaClass = SchemaFactory.createForClass(UserDepositSchema)