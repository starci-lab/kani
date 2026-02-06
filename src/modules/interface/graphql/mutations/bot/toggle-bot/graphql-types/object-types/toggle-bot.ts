import {
    ObjectType
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse
} from "@modules/api"

@ObjectType({
    description:
        "Standard GraphQL response returned after toggling a bot's running state.",
})
export class ToggleBotResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
