import {
    ObjectType,
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse,
} from "@modules/api"

/** Response returned after successfully requesting a send 2-factor OTP. */
@ObjectType({
    description: "Response returned after successfully requesting a send 2-factor OTP.",
})
export class RequestSend2FactorOtpResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
