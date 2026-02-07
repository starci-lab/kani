import {
    Field, ObjectType,
} from "@nestjs/graphql"
import {
    TransactionSchema,
} from "@modules/databases"
import {
    AbstractGraphQLResponse,
    IAbstractGraphQLResponse,
    IPaginationPageResponseData,
    PaginationPageResponseData,
} from "@modules/api"

/** The response for fetching transactions v2. */
@ObjectType({
    description: "The response for fetching transactions v2.",
})
export class TransactionsV2ResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<TransactionSchema>
{
    @Field(() => [TransactionSchema],
        {
            description: "Transactions.",
        })
        data: Array<TransactionSchema>
}

/** The response for fetching transactions v2. */
@ObjectType({
    description: "The response for fetching transactions v2.",
})
export class TransactionsV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<TransactionsV2ResponseData>
{
    @Field(() => TransactionsV2ResponseData,
        {
            description: "The data for the transactions.",
        })
        data: TransactionsV2ResponseData
}
