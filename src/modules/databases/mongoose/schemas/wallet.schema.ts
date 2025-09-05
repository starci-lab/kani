import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Field, ObjectType } from "@nestjs/graphql"

@Schema({ autoCreate: false })
@ObjectType()
export class WalletSchema {
    @Field(() => String, { nullable: true })
    @Prop({ type: String, required: false })
        publicKey?: string

    @Field(() => String, { nullable: true })
    @Prop({ type: String, required: false })
        encryptedPrivateKey?: string
}

export const WalletSchemaClass = SchemaFactory.createForClass(WalletSchema)