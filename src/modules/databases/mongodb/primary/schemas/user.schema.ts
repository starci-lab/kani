import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { AbstractSchema } from "./abstract"
import { Field, ObjectType } from "@nestjs/graphql"
import { GraphQLTypeOauthProviderName, OauthProviderName } from "../enums"

@Schema({
    timestamps: true,
    collection: "users",
})
@ObjectType({
    description: "User entity represents a registered user in the system, including their OAuth info and multi-chain wallets.",
})
export class UserSchema extends AbstractSchema {
    /** @deprecated Use privyUserId instead */
    @Field(() => String, {
        deprecationReason: "Use privyUserId instead",
        description: "Unique ID from the OAuth provider (e.g., Google user ID).",
        nullable: true,
    })
    @Prop({ type: String, required: false })
        oauthProviderId?: string

    /** @deprecated Use privyProvider instead */
    @Field(() => GraphQLTypeOauthProviderName, {
        deprecationReason: "Use privyProvider instead",
        description: "The OAuth provider that the user used to sign in (e.g., GOOGLE).",
        nullable: true,
    })
    @Prop({ type: String, enum: OauthProviderName, required: false })
        oauthProvider?: OauthProviderName

    @Field(() => String, {
        description: "User's email address.",
        nullable: true,
        deprecationReason: "Use privy instead",
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

    @Field(() => Boolean, {
        description: "Whether the multi-factor authentication is enabled.",
    })
    @Prop({ type: Boolean, default: false })
        mfaEnabled: boolean
}

export const UserSchemaClass = SchemaFactory.createForClass(UserSchema)