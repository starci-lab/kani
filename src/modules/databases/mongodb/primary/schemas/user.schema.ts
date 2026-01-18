import {
    Prop, Schema, SchemaFactory 
} from "@nestjs/mongoose"
import {
    AbstractSchema 
} from "./abstract"
import {
    Field, ObjectType 
} from "@nestjs/graphql"
import {
    EncryptedPayload 
} from "@typedefs"
import {
    Schema as MongooseSchema 
} from "mongoose"
import {
    AppVersion, GraphQLTypeAppVersion 
} from "../enums"

@Schema({
    timestamps: true,
    collection: "users",
})
@ObjectType({
    description: "User entity represents a registered user in the system, including their OAuth info and multi-chain wallets.",
})
export class UserSchema extends AbstractSchema {
    @Field(() => String,
        {
            description: "User's email address.",
            nullable: true,
            deprecationReason: "Use privy instead",
        })
    @Prop({
        type: String, required: false 
    })
        email: string

    @Field(() => String,
        {
            description: "Public username chosen or derived for the user.",
            nullable: true,
        })
    @Prop({
        type: String, required: false 
    })
        username?: string

    @Field(() => String,
        {
            description: "URL of the user's profile picture.",
            nullable: true,
        })
    @Prop({
        type: String, required: false 
    })
        picture?: string

    @Prop({
        type: MongooseSchema.Types.Mixed, required: false 
    })
        encryptedTotpSecretPayload?: EncryptedPayload

    @Field(() => String,
        {
            description: "Unique referral code assigned to the user for referral tracking.",
            nullable: true,
        })
    @Prop({
        type: String, required: false 
    })
        referralCode?: string
    
    @Field(() => String,
        {
            description: "A temporary token used to complete TOTP verification during the first login step.",
            nullable: true,
        })
        temporaryTotpToken?: string

    @Field(() => Boolean,
        {
            description: "Whether the multi-factor authentication is enabled.",
        })
    @Prop({
        type: Boolean, required: false 
    })
        mfaEnabled: boolean

    @Field(() => String,
        {
            description: "The user's Privy user ID.",
            nullable: true,
        })
    @Prop({
        type: String, required: false 
    })
        privyUserId: string

    @Field(() => GraphQLTypeAppVersion,
        {
            description: "The version of the app",
            defaultValue: AppVersion.V1,
        })
    @Prop({
        type: String, enum: AppVersion, required: true, default: AppVersion.V1 
    })
        version: AppVersion
}   

export const UserSchemaClass = SchemaFactory.createForClass(UserSchema)

// index the user by privy user id
UserSchemaClass.index({
    privyUserId: 1 
},
{
    unique: true 
})