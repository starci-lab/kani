import {
    Field, InputType,
} from "@nestjs/graphql"

/** Request payload for enabling authenticator app v2. */
@InputType({
    description: "Request payload for enabling authenticator app v2.",
})
export class EnableAuthenticatorAppV2Request {
    @Field(() => String,
        {
            description: "The TOTP code to verify before enabling authenticator app.",
        })
        totpCode: string
}
