import { ObjectType, Field } from "@nestjs/graphql"
import { TokenSchema } from "@modules/databases"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../../abstracts"
/**
 * GraphQL response type for the tokens query.
 */
@ObjectType({
    description: "GraphQL response object for fetching tokens.",
})
export class TokensResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Array<TokenSchema>>
{
    @Field(() => [TokenSchema], {
        description: "List of tokens returned by the query.",
    })
        data: Array<TokenSchema>
}

