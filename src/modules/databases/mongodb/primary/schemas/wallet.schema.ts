import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Field, ObjectType } from "@nestjs/graphql" 
import { ChainConfigSchema, ChainConfigSchemaClass } from "./chain-config.schema"
import { GraphQLTypePlatformId, PlatformId } from "@typedefs"

@Schema({ autoCreate: false })
@ObjectType()
export class WalletSchema {
    @Field(() => String)
    @Prop({ type: String })
        publicKey: string

    @Field(() => String)
    @Prop({ type: String })
        encryptedPrivateKey: string

    @Field(() => [ChainConfigSchema])
    @Prop({ type: [ChainConfigSchemaClass] })
        chainConfigs: Array<ChainConfigSchema>

    @Field(() => GraphQLTypePlatformId)
    @Prop({ type: String, enum: PlatformId, required: true })
        platformId: PlatformId
}

export const WalletSchemaClass = SchemaFactory.createForClass(WalletSchema)