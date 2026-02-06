import {
    ObjectType
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse
} from "@modules/api"

@ObjectType({
    description: "Standard GraphQL response returned after updating bot chart config (v2).",
})
export class UpdateBotChartConfigV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
