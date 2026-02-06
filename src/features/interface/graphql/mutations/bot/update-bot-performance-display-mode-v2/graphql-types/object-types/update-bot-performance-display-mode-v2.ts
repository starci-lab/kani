import {
    ObjectType
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse
} from "@modules/api"

@ObjectType({
    description:
        "Standard GraphQL response returned after updating a bot's performance display mode v2.",
})
export class UpdateBotPerformanceDisplayModeV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
