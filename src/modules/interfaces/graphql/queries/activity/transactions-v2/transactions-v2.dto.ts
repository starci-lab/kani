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
    description: "The request for fetching transactions v2.",
})
export class TransactionsV2PaginationCursorFilters extends PaginationCursorFilters {
    @Field(() => Boolean, {
        defaultValue: false,
        description: "Whether to sort the transactions by timestamp in ascending order.",
    })
        timestampAscending?: boolean
}

@ObjectType({
    description: "The response for fetching transactions v2.",
})
export class TransactionsV2ResponseData
    extends PaginationCursorResponseData
    implements IPaginationCursorResponseData<TransactionSchema> {
    @Field(() => [TransactionSchema], {
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
    @Field(() => TransactionsV2ResponseData, {
        description: "The data for the transactions.",
    })
        data: TransactionsV2ResponseData
}

@InputType({
    description: "Input fields required to fetch transactions v2.",
})
export class TransactionsV2Request {
    @Field(() => TransactionsV2PaginationCursorFilters, {
        description: "The filters for pagination.",
    })
        filters: TransactionsV2PaginationCursorFilters
    @Field(() => ID, {
        description: "The ID of the bot to fetch transactions for.",
    })
        botId: string
}

export interface TransactionsV2Cursor {
    // the timestamp of the last record
    timestamp: string
}

