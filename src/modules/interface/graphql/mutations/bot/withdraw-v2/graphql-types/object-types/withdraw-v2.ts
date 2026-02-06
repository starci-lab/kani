import {
    ObjectType
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse
} from "@modules/api"

@ObjectType(
    {
        description: "Standard GraphQL response returned after withdrawing from a bot (v2).",
    }
)
export class WithdrawV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<undefined> {
}
