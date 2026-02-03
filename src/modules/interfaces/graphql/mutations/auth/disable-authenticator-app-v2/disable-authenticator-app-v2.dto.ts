import {
    Field, InputType, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse 
} from "../../../abstracts"

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


@ObjectType({
    description: "Response returned after successfully disabling authenticator app v2.",
})
export class DisableAuthenticatorAppV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
