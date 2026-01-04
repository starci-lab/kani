import { Field, Float, ID, InputType, ObjectType } from "@nestjs/graphql"
import { 
    AbstractGraphQLResponse, 
    IAbstractGraphQLResponse
} from "../../../abstracts"

@InputType({
    description: "Input parameters used to request accrued fees for a bot position.",
})
export class FeesRequest {
    @Field(() => ID, {
        description: "Unique identifier of the bot whose fees are being queried.",
    })
        botId: string
}

@ObjectType({
    description: "Fee amounts accrued by a bot position, broken down by token.",
})
export class FeesResponseData {
    @Field(() => Float, {
        description: "Accrued fee amount for tokenA.",
    })
        tokenA: number

    @Field(() => Float, {
        description: "Accrued fee amount for tokenB.",
    })
        tokenB: number
}

@ObjectType({
    description: "GraphQL response wrapper for a fees query.",
})
export class FeesResponse
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<FeesResponseData> {

    @Field(() => FeesResponseData, {
        description: "Fee data returned for the requested bot.",
    })
        data: FeesResponseData
}