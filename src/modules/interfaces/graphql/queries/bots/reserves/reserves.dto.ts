import { Field, Float, ID, InputType, ObjectType } from "@nestjs/graphql"
import {
    AbstractGraphQLResponse,
    IAbstractGraphQLResponse,
} from "../../../abstracts"

@InputType({
    description: "Input parameters used to request the accrued reserves of a bot position.",
})
export class ReservesRequest {
    @Field(() => ID, {
        description: "The unique identifier of the bot whose reserves are being queried.",
    })
        botId: string
    @Field(() => ID, {
        description: "The unique identifier of the active position whose reserves are being queried.",
    })
        activePositionId: string
}

@ObjectType({
    description:
        "Accrued reserve amounts for a bot position, broken down by token.",
})
export class ReservesResponseData {
    @Field(() => Float, {
        description: "The accrued reserve amount for token A.",
    })
        tokenA: number

    @Field(() => Float, {
        description: "The accrued reserve amount for token B.",
    })
        tokenB: number

}

@ObjectType({
    description: "GraphQL response wrapper for a reserves query.",
})
export class ReservesResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<ReservesResponseData>
{
    @Field(() => ReservesResponseData, {
        nullable: true,
        description: "The reserves data returned for the requested bot.",
    })
        data?: ReservesResponseData
}