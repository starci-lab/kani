import {
    Field, ID, InputType,
} from "@nestjs/graphql"
import {
    PaginationPageFilters,
} from "@modules/api"

/** The request for fetching transactions v2. */
@InputType({
    description: "The request for fetching transactions v2.",
})
export class TransactionsV2PaginationFilters extends PaginationPageFilters {
    @Field(() => Boolean,
        {
            nullable: true,
            description: "Whether to sort the transactions by createdAt in ascending order.",
        })
    asc?: boolean
}

/** Input fields required to fetch transactions v2. */
@InputType({
    description: "Input fields required to fetch transactions v2.",
})
export class TransactionsV2Request {
    @Field(() => TransactionsV2PaginationFilters,
        {
            description: "The filters for pagination.",
        })
    filters: TransactionsV2PaginationFilters
    @Field(() => ID,
        {
            description: "The ID of the bot to fetch transactions for.",
        })
    botId: string
}
