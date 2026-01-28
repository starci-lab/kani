import {
    Field,
    Float,
    ID,
    InputType,
    ObjectType,
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse,
    IAbstractGraphQLResponse,
} from "../../../abstracts"
import GraphQLJSON from "graphql-type-json"

@InputType({
    description: "Input parameters used to request reserves and fees for a bot position (v2).",
})
export class ReservesWithFeesV2Request {
    @Field(() => ID, {
        description: "Unique identifier of the bot whose reserves and fees are being queried.",
    })
        botId: string
}

@ObjectType({
    description: "Reserve and fee amounts for a bot position, broken down by token (v2).",
})
export class ReservesWithFeesV2ResponseData {
    @Field(() => Float, {
        description: "Reserve amount for token A.",
    })
        reserveA: number

    @Field(() => Float, {
        description: "Reserve amount for token B.",
    })
        reserveB: number

    @Field(() => Float, {
        description: "Accrued fee amount for token A.",
    })
        feeA: number

    @Field(() => Float, {
        description: "Accrued fee amount for token B.",
    })
        feeB: number

    @Field(() => GraphQLJSON, {
        description: "Accrued rewards per reward token (key: token id).",
    })
        rewards: unknown

    @Field(() => Date, {
        description: "Timestamp of the snapshot.",
    })
        snapshotAt: Date
}

@ObjectType({
    description: "GraphQL response wrapper for reserves-with-fees query (v2).",
})
export class ReservesWithFeesV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<ReservesWithFeesV2ResponseData> {
    @Field(() => ReservesWithFeesV2ResponseData, {
        nullable: true,
        description: "Reserves and fees data for the requested bot.",
    })
        data?: ReservesWithFeesV2ResponseData
}
