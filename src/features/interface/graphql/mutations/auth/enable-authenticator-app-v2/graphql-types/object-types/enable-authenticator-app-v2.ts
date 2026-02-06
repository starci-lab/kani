import {
    ObjectType,
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse,
} from "@modules/api"

/** Response returned after successfully enabling authenticator app v2. */
@ObjectType({
    description: "Response returned after successfully enabling authenticator app v2.",
})
export class EnableAuthenticatorAppV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
