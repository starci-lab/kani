import { Field, ID, InputType, ObjectType } from "@nestjs/graphql"
import { TransactionSchema } from "@modules/databases"
import { 
    IPaginationCursorResponseData, 
    PaginationCursorFilters, 
    PaginationCursorResponseData, 
    AbstractGraphQLResponse, 
    IAbstractGraphQLResponse 
} from "../../../abstracts"

@InputType({
    description: "The request for fetching transactions.",
})
export class TransactionsPaginationCursorFilters extends PaginationCursorFilters {
    @Field(() => Boolean, {
        defaultValue: false,
        description: "Whether to sort the transactions by timestamp in ascending order.",
    })
        timestampAscending?: boolean
}

@ObjectType({
    description: "The response for fetching transactions.",
})
export class TransactionsResponseData
    extends PaginationCursorResponseData
    implements IPaginationCursorResponseData<TransactionSchema> {
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
    @Field(() => TransactionsPaginationCursorFilters, {
        description: "The filters for pagination.",
    })
        filters: TransactionsPaginationCursorFilters
    @Field(() => ID, {
        description: "The ID of the user to fetch transactions for.",
    })
        botId: string
}

export interface TransactionsCursor {
    // the createdAt of the last record
    timestamp: string
}

