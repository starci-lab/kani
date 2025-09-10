import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Field, ObjectType } from "@nestjs/graphql"
import { GraphQLTypeFarmType, FarmType } from "@modules/databases"

@Schema({ autoCreate: false })
@ObjectType()
export class WalletSchema {
    @Field(() => String, { nullable: true })
    @Prop({ type: String, required: false })
        publicKey?: string

    @Field(() => String, { nullable: true })
    @Prop({ type: String, required: false })
        encryptedPrivateKey?: string

    @Field(() => GraphQLTypeFarmType, { nullable: true })
    @Prop({ type: String, enum: FarmType, required: false })
        type?: FarmType
}

export const WalletSchemaClass = SchemaFactory.createForClass(WalletSchema)