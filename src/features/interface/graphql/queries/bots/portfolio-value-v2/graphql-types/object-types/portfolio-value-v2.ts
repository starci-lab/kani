import {
    Field, Float, ObjectType,
} from "@nestjs/graphql"
import {
    AbstractGraphQLResponse,
    IAbstractGraphQLResponse,
} from "@modules/api"
import {
    BalanceEvalStatus,
    GraphQLTypeBalanceEvalStatus,
} from "@modules/blockchains"

/** Portfolio value snapshot values (excluding/including gas). */
@ObjectType({
    description: "Portfolio value snapshot values (excluding/including gas).",
})
export class PortfolioValueV2Snapshot {
    @Field(() => Float,
        {
            description: "Portfolio value excluding gas.",
        })
        excludingGas: number

    @Field(() => Float,
        {
            description: "Portfolio value including gas.",
        })
        includingGas: number
}

/** Portfolio value of a bot. */
@ObjectType({
    description: "Portfolio value of a bot.",
})
export class PortfolioValueV2ResponseData {
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

    @Field(() => PortfolioValueV2Snapshot,
        {
            description: "Portfolio value denominated in the target token (from EvalBalanceService).",
        })
        portfolioValue: PortfolioValueV2Snapshot

    @Field(() => PortfolioValueV2Snapshot,
        {
            description: "Portfolio value denominated in USD (from EvalBalanceService).",
        })
        portfolioValueInUsd: PortfolioValueV2Snapshot

    @Field(() => GraphQLTypeBalanceEvalStatus,
        {
            description: "Eligibility status from EvalBalanceService.",
        })
        status: BalanceEvalStatus
}

/** GraphQL response wrapper for a portfolio value query v2. */
@ObjectType({
    description: "GraphQL response wrapper for a portfolio value query v2.",
})
export class PortfolioValueV2Response
    extends AbstractGraphQLResponse
    implements IAbstractGraphQLResponse<PortfolioValueV2ResponseData>
{
    @Field(() => PortfolioValueV2ResponseData,
        {
            nullable: true,
            description: "The portfolio value data returned for the requested bot.",
        })
        data?: PortfolioValueV2ResponseData
}
