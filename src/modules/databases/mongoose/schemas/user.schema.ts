import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { Field, ObjectType } from "@nestjs/graphql"
import { GraphQLTypeOauthProviderName, OauthProviderName } from "../../enums"
import { WalletSchema } from "./wallet.schema"

@Schema({
    timestamps: true,
    collection: "users",
})
@ObjectType({
    description: "User entity represents a registered user in the system, including their OAuth info and multi-chain wallets.",
})
export class UserSchema extends AbstractSchema {
    @Field(() => String, {
        description: "Unique ID from the OAuth provider (e.g., Google user ID).",
        nullable: true,
    })
    @Prop({ type: String, required: false })
        oauthProviderId?: string

    @Field(() => GraphQLTypeOauthProviderName, {
        description: "The OAuth provider that the user used to sign in (e.g., GOOGLE).",
        nullable: true,
    })
    @Prop({ type: String, enum: OauthProviderName, required: false })
        oauthProvider?: OauthProviderName

    @Field(() => String, {
        description: "User's email address.",
        nullable: true,
    })
    @Prop({ type: String, required: false })
        email?: string

    @Field(() => String, {
        description: "Public username chosen or derived for the user.",
        nullable: true,
    })
    @Prop({ type: String, required: false })
        username?: string

    @Field(() => String, {
        description: "URL of the user's profile picture.",
        nullable: true,
    })
    @Prop({ type: String, required: false })
        picture?: string

    @Field(() => WalletSchema, {
        description: "User's Solana wallet information, if connected.",
        nullable: true,
    })
    @Prop({ type: WalletSchema, required: false })
        solana?: WalletSchema

    @Field(() => WalletSchema, {
        description: "User's Sui wallet information, if connected.",
        nullable: true,
    })
    @Prop({ type: WalletSchema, required: false })
        sui?: WalletSchema

    @Field(() => WalletSchema, {
        description: "User's EVM-compatible wallet information, if connected (e.g., MetaMask).",
        nullable: true,
    })
    @Prop({ type: WalletSchema, required: false })
        evm?: WalletSchema

    @Field(() => String, {
        description: "Encrypted TOTP secret for 2FA if user has enabled two-factor authentication.",
        nullable: true,
    })
    @Prop({ type: String, required: false })
        encryptedTotpSecret?: string

    @Field(() => String, {
        description: "Unique referral code assigned to the user for referral tracking.",
        nullable: true,
    })
    @Prop({ type: String, required: false })
        referralCode?: string
    
    @Prop({ type: Boolean, default: false })
        totpVerified?: boolean
    
    @Field(() => String, {
        description: "A temporary token used to complete TOTP verification during the first login step.",
        nullable: true,
    })
        temporaryTotpToken?: string
}

export const UserSchemaClass = SchemaFactory.createForClass(UserSchema)