import {
    ObjectType
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse, IAbstractGraphQLResponse
} from "@modules/api"

@ObjectType({
    description: "Standard GraphQL response returned after updating bot settings (v2).",
})
export class UpdateBotSettingsV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse {
}
