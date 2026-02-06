import {
    Field, InputType,
} from "@nestjs/graphql"

/** Request payload for disabling authenticator app v2. */
@InputType({
    description: "Request payload for disabling authenticator app v2.",
})
export class DisableAuthenticatorAppV2Request {
    @Field(() => String,
        {
            description: "The TOTP code to verify before disabling authenticator app.",
        })
    totpCode: string
}
