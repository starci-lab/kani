import { Field, ObjectType } from "@nestjs/graphql"
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Schema as MongooseSchema, Types } from "mongoose"
import { UserSchema } from "./user.schema"

@Schema({ autoCreate: false })
@ObjectType({ description: "Represents a blockchain wallet linked to a user" })
export class UserWalletSchema {
  @Field(() => UserSchema, { description: "Owner of the wallet" })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: UserSchema.name, required: true })
      user: UserSchema | Types.ObjectId

  @Field(() => String, { description: "The public key (address) of the wallet" })
  @Prop({ type: String, required: true, unique: true })
      publicKey: string

  @Field(() => String, { description: "The encrypted private key stored securely" })
  @Prop({ type: String, required: true })
      encryptedPrivateKey: string
}

export const UserWalletSchemaClass = SchemaFactory.createForClass(UserWalletSchema)
