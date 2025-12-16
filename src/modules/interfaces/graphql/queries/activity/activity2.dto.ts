import { Field, ID, InputType, ObjectType } from "@nestjs/graphql"
import { PositionSchema, TransactionSchema } from "@modules/databases"
import { 
    AbstractGraphQLResponse, 
    IAbstractGraphQLResponse, 
    IPaginationPageResponseData, 
    PaginationPageResponseData
} from "../../abstracts"
import { PaginationPageFilters } from "../../abstracts"

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

@InputType({
    description: "The request for fetching positions.",
})
export class Positions2PaginationPageFilters extends PaginationPageFilters {
    @Field(() => Boolean, {
        defaultValue: false,
        description: "Whether to sort the positions by timestamp in ascending order.",
    })
        timestampAscending?: boolean
}

@InputType({
    description: "The input type for the cursor for fetching positions.",
})
export class Positions2Request {
    @Field(() => Positions2PaginationPageFilters, {
        description: "The filters for pagination.",
    })
        filters: Positions2PaginationPageFilters
    @Field(() => ID, {
        description: "The ID of the bot to fetch positions for.",
    })
        botId: string
}

@ObjectType({
    description: "The response for fetching positions.",
})
export class Positions2ResponseData
    extends PaginationPageResponseData
    implements IPaginationPageResponseData<PositionSchema> {
    @Field(() => [PositionSchema], {
        description: "Positions.",
    })
        data: Array<PositionSchema>
}   

@ObjectType({
    description: "The response for fetching positions.",
})
export class Positions2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<Positions2ResponseData> {
    @Field(() => Positions2ResponseData, {
        description: "The data for the positions.",
    })
        data: Positions2ResponseData
}

export interface Positions2Cursor {
    // the positionOpenedAt of the last record
    timestamp: string
}