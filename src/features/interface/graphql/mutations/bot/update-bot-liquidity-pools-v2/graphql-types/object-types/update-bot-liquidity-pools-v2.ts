import {
    ObjectType
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse
} from "@modules/api"

@ObjectType({
    description: "Standard GraphQL response returned after updating bot liquidity pools (v2).",
})
export class UpdateBotLiquidityPoolsV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
