import {
    Field, ID, InputType, ObjectType 
} from "@nestjs/graphql"
import {
    TransactionSchema 
} from "@modules/databases"
import { 
    AbstractGraphQLResponse, 
    IAbstractGraphQLResponse, 
    IPaginationPageResponseData, 
    PaginationPageResponseData
} from "../../../abstracts"
import {
    PaginationPageFilters 
} from "../../../abstracts"

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

@ObjectType({
    description: "The response for fetching transactions v2.",
})
export class TransactionsV2ResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<TransactionSchema> {
    @Field(() => [TransactionSchema],
        {
            description: "Transactions.",
        })
        data: Array<TransactionSchema>
}

@ObjectType({
    description: "The response for fetching transactions v2.",
})
export class TransactionsV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<TransactionsV2ResponseData> {
    @Field(() => TransactionsV2ResponseData,
        {
            description: "The data for the transactions.",
        })
        data: TransactionsV2ResponseData
}

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

