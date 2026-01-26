import {
    Field, Float, ID, InputType, ObjectType 
} from "@nestjs/graphql"
import { 
    AbstractGraphQLResponse, 
    IAbstractGraphQLResponse
} from "../../../abstracts"

@InputType({
    description: "Input parameters used to request accrued fees for a bot position v2.",
})
export class FeesV2Request {
    @Field(() => ID,
        {
            description: "Unique identifier of the bot whose fees are being queried.",
        })
        botId: string
}

@ObjectType({
    description: "Fee amounts accrued by a bot position, broken down by token v2.",
})
export class FeesV2ResponseData {
    @Field(() => Float,
        {
            description: "Accrued fee amount for fee A.",
        })
        feeA: number

    @Field(() => Float,
        {
            description: "Accrued fee amount for fee B.",
        })
        feeB: number
    @Field(() => Date,
        {
            description: "The date and time the fees were snapshot.",
        })
        snapshotAt: Date
}

@ObjectType({
    description: "GraphQL response wrapper for a fees query v2.",
})
export class FeesV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<FeesV2ResponseData> {

    @Field(() => FeesV2ResponseData,
        {
            nullable: true,
            description: "Fee data returned for the requested bot.",
        })
        data?: FeesV2ResponseData
}

