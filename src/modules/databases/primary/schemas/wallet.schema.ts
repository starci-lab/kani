import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Field, ObjectType } from "@nestjs/graphql" 
import { ChainConfigSchema, ChainConfigSchemaClass } from "./chain-config.schema"
import { GraphQLTypePlatformId, PlatformId } from "@modules/common"

@Schema({ autoCreate: false })
@ObjectType()
export class WalletSchema {
    @Field(() => String, { nullable: true })
    @Prop({ type: String, required: false })
        publicKey?: string

    @Field(() => String, { nullable: true })
    @Prop({ type: String, required: false })
        encryptedPrivateKey?: string

    @Field(() => [ChainConfigSchema], { nullable: true })
    @Prop({ type: [ChainConfigSchemaClass], required: false })
        chainConfigs?: Array<ChainConfigSchema>

    @Field(() => GraphQLTypePlatformId, { nullable: true })
    @Prop({ type: String, enum: PlatformId, required: true })
        platformId: PlatformId
}

export const WalletSchemaClass = SchemaFactory.createForClass(WalletSchema)