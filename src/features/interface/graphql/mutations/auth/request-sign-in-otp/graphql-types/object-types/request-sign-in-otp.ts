import {
    ObjectType,
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse,
} from "@modules/api"

/** Response returned after successfully requesting a sign in OTP. */
@ObjectType({
    description: "Response returned after successfully requesting a sign in OTP.",
})
export class RequestSignInOtpResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
