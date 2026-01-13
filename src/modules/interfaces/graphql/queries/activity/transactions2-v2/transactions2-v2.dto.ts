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
    description: "The request for fetching transactions v2.",
})
export class Transactions2V2PaginationPageFilters extends PaginationPageFilters {
    @Field(() => Boolean, {
        nullable: true,
        description: "Whether to sort the transactions by createdAt in ascending order.",
    })
        asc?: boolean
}

@ObjectType({
    description: "The response for fetching transactions v2.",
})
export class Transactions2V2ResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<TransactionSchema> {
    @Field(() => [TransactionSchema], {
        description: "Transactions.",
    })
        data: Array<TransactionSchema>
}

@ObjectType({
    description: "The response for fetching transactions v2.",
})
export class Transactions2V2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Transactions2V2ResponseData> {
    @Field(() => Transactions2V2ResponseData, {
        description: "The data for the transactions.",
    })
        data: Transactions2V2ResponseData
}

@InputType({
    description: "Input fields required to fetch transactions v2.",
})
export class Transactions2V2Request {
    @Field(() => Transactions2V2PaginationPageFilters, {
        description: "The filters for pagination.",
    })
        filters: Transactions2V2PaginationPageFilters
    @Field(() => ID, {
        description: "The ID of the bot to fetch transactions for.",
    })
        botId: string
}

