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
export class Transactions2PaginationPageFilters extends PaginationPageFilters {
    @Field(() => Boolean, {
        defaultValue: false,
        description: "Whether to sort the transactions by timestamp in ascending order.",
    })
        timestampAscending?: boolean
}

@ObjectType({
    description: "The response for fetching transactions.",
})
export class Transactions2ResponseData
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
export class Transactions2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Transactions2ResponseData> {
    @Field(() => Transactions2ResponseData, {
        description: "The data for the transactions.",
    })
        data: Transactions2ResponseData
}

@InputType({
    description: "Input fields required to fetch transactions.",
})
export class Transactions2Request {
    @Field(() => Transactions2PaginationPageFilters, {
        description: "The filters for pagination.",
    })
        filters: Transactions2PaginationPageFilters
    @Field(() => ID, {
        description: "The ID of the user to fetch transactions for.",
    })
        botId: string
}

export interface Transactions2Cursor {
    // the createdAt of the last record
    timestamp: string
}

