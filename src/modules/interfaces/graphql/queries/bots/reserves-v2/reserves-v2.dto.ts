import {
    Field, Float, ID, InputType, ObjectType 
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse,
    IAbstractGraphQLResponse,
} from "../../../abstracts"

@InputType({
    description: "Input parameters used to request the accrued reserves of a bot position v2.",
})
export class ReservesV2Request {
    @Field(() => ID,
        {
            description: "The unique identifier of the bot whose reserves are being queried.",
        })
        botId: string
}

@ObjectType({
    description:
        "Accrued reserve amounts for a bot position, broken down by token v2.",
})
export class ReservesV2ResponseData {
    @Field(() => Float,
        {
            description: "The accrued reserve amount for reserve A.",
        })
        reserveA: number

    @Field(() => Float,
        {
            description: "The accrued reserve amount for reserve B.",
        })
        reserveB: number

    @Field(() => Date,
        {
            description: "The date and time the reserves were snapshot.",
        })
        snapshotAt: Date
}

@ObjectType({
    description: "GraphQL response wrapper for a reserves query v2.",
})
export class ReservesV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<ReservesV2ResponseData>
{
    @Field(() => ReservesV2ResponseData,
        {
            nullable: true,
            description: "The reserves data returned for the requested bot.",
        })
        data?: ReservesV2ResponseData
}

