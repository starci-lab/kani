import { Field, ObjectType } from "@nestjs/graphql"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"

@Schema({ autoCreate: false })
@ObjectType({ description: "Represents a blockchain wallet linked to a user" })
export class UserWalletSchema {
  @Field(() => String, { description: "The account address of the wallet" })
  @Prop({ type: String, required: true, unique: true })
      accountAddress: string

  @Field(() => String, { description: "The encrypted private key stored securely" })
  @Prop({ type: String, required: true })
      encryptedPrivateKey: string
}

export const UserWalletSchemaClass = SchemaFactory.createForClass(UserWalletSchema)
