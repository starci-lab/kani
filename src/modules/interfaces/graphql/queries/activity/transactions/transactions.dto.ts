import { Field, ID, InputType, ObjectType } from "@nestjs/graphql"
import { TransactionSchema } from "@modules/databases"
import { 
    AbstractGraphQLResponse, 
    IAbstractGraphQLResponse, 
    IPaginationPageResponseData, 
    PaginationPageResponseData
} from "../../../abstracts"
import { PaginationPageFilters } from "../../../abstracts"

@InputType({
    description: "The request for fetching transactions.",
})
export class TransactionsPaginationFilters extends PaginationPageFilters {
    @Field(() => Boolean, {
        nullable: true,
        description: "Whether to sort the transactions by timestamp in ascending order.",
    })
        asc?: boolean
}

@ObjectType({
    description: "The response for fetching transactions.",
})
export class TransactionsResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<TransactionSchema> {
    @Field(() => [TransactionSchema], {
        description: "Transactions.",
    })
        data: Array<TransactionSchema>
}

@ObjectType({
    description: "The response for fetching transactions.",
})
export class TransactionsResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<TransactionsResponseData> {
    @Field(() => TransactionsResponseData, {
        description: "The data for the transactions.",
    })
        data: TransactionsResponseData
}

@InputType({
    description: "Input fields required to fetch transactions.",
})
export class TransactionsRequest {
    @Field(() => TransactionsPaginationFilters, {
        description: "The filters for pagination.",
    })
        filters: TransactionsPaginationFilters
    @Field(() => ID, {
        description: "The ID of the user to fetch transactions for.",
    })
        botId: string
}
