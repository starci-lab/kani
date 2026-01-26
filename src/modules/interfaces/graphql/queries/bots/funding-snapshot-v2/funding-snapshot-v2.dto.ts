import {
    Field, 
    Float, 
    ID, 
    InputType, 
    ObjectType
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse,
    IAbstractGraphQLResponse,
} from "../../../abstracts"

@InputType({
    description: "Input parameters used to request the funding snapshot of a bot.",
})
export class FundingSnapshotV2Request {
    @Field(() => ID,
        {
            description: "The unique identifier of the bot whose funding snapshot is being requested.",
        })
        botId: string
}

@ObjectType({
    description:
        "Funding snapshot of a bot.",
})
export class FundingSnapshotV2ResponseData {
    @Field(() => Float,
        {
            description: "The target balance amount of the bot.",
        })
        targetBalanceAmount: number
    @Field(() => Float,
        {
            description: "The quote balance amount of the bot.",
        })
        quoteBalanceAmount: number
    @Field(() => Float,
        {
            description: "The gas balance amount of the bot.",
        })
        gasBalanceAmount: number
    @Field(() => Float,
        {
            description: "The balance of the bot excluding the gas balance in USD.",
        })
        balanceExcludingGasInUsdc: number
    @Field(() => Float,
        {
            description: "The balance of the bot including the gas balance in USD.",
        })
        balanceIncludingGasInUsdc: number
    @Field(() => Boolean,
        {
            description: "Whether the bot is eligible to operate.",
        })
        isEligible: boolean
}

@ObjectType({
    description: "GraphQL response wrapper for a funding snapshot query v2.",
})
export class FundingSnapshotV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<FundingSnapshotV2ResponseData> {
    @Field(() => FundingSnapshotV2ResponseData,
        {
            nullable: true,
            description: "The funding snapshot data returned for the requested bot.",
        })
        data?: FundingSnapshotV2ResponseData
}

