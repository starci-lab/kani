import {
    Field, ID, InputType,
} from "@nestjs/graphql"
import {
    PaginationPageFilters,
} from "@modules/api"

/** The request for fetching transactions. */
@InputType({
    description: "The request for fetching transactions.",
})
export class TransactionsPaginationFilters extends PaginationPageFilters {
    @Field(() => Boolean,
        {
            nullable: true,
            description: "Whether to sort the transactions by timestamp in ascending order.",
        })
        asc?: boolean
}

/** Input fields required to fetch transactions. */
@InputType({
    description: "Input fields required to fetch transactions.",
})
export class TransactionsRequest {
    @Field(() => TransactionsPaginationFilters,
        {
            description: "The filters for pagination.",
        })
        filters: TransactionsPaginationFilters
    @Field(() => ID,
        {
            description: "The ID of the user to fetch transactions for.",
        })
        botId: string
}
