import {
    Field, InputType, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "../../../abstracts"

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


@ObjectType({
    description: "Response returned after successfully enabling authenticator app v2.",
})
export class EnableAuthenticatorAppV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
