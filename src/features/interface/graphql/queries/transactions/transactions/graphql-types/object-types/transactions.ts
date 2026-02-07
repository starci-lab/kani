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

/** The response for fetching transactions. */
@ObjectType({
    description: "The response for fetching transactions.",
})
export class TransactionsResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<TransactionSchema>
{
    @Field(() => [TransactionSchema],
        {
            description: "Transactions.",
        })
        data: Array<TransactionSchema>
}

/** The response for fetching transactions. */
@ObjectType({
    description: "The response for fetching transactions.",
})
export class TransactionsResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<TransactionsResponseData>
{
    @Field(() => TransactionsResponseData,
        {
            description: "The data for the transactions.",
        })
        data: TransactionsResponseData
}
