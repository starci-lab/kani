import {
    ObjectType
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse
} from "@modules/api"

@ObjectType({
    description:
        "Standard GraphQL response returned after toggling a bot's running state v2.",
})
export class ToggleBotV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
