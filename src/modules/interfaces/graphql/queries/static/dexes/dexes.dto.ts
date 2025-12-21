import { ObjectType, Field } from "@nestjs/graphql"
import { DexSchema } from "@modules/databases"
import { AbstractGraphQLResponse, IAbstractGraphQLResponse } from "../../../abstracts"
/**
 * GraphQL response type for the dexes query.
 */
@ObjectType({
    description: "GraphQL response object for fetching dexes.",
})
export class DexesResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Array<DexSchema>>
{
    @Field(() => [DexSchema], {
        description: "List of dexes returned by the query.",
    })
        data: Array<DexSchema>
}

