import { Field, Float, Int, ObjectType } from "@nestjs/graphql"
import GraphQLJSON from "graphql-type-json"
import { Atomic } from "./atomic"
import { GraphQLTypeTokenType, TokenType } from "./blockchain"

@ObjectType({
    description: "Yield of the strategy in 24h, 7d, 30d, 365d",
})
export class YieldPeriodMetric {
    @Field(() => Float, {
        nullable: true,
        description: "Base yield of the strategy",
    })
        base?: number
    @Field(() => Float, {
        nullable: true,
        description: "Yield of the strategy in 24h",
    })
        day?: number

    @Field(() => Float, {
        nullable: true,
        description: "Yield of the strategy in 7d",
    })
        week?: number

    @Field(() => Float, {
        nullable: true,
        description: "Yield of the strategy in 30d",
    })
        month?: number

    @Field(() => Float, {
        nullable: true,
        description: "Yield of the strategy in 365d",
    })
        year?: number
}

@ObjectType({
    description: "Yield summary of the strategy",
})
export class YieldSummary {
    @Field(() => YieldPeriodMetric, {
        nullable: true,
        description: "Yield of the strategy in 24h, 7d, 30d, 365d",
    })
        aprs?: YieldPeriodMetric
    @Field(() => YieldPeriodMetric, {
        nullable: true,
        description: "Yield of the strategy in 24h, 7d, 30d, 365d",
    })
        apys?: YieldPeriodMetric
    @Field(() => Float, {
        nullable: true,
        description: "TVL of the strategy",
    })
        tvl?: number
}

@ObjectType({
    description: "Output token of the strategy",
})
export class GraphQLToken {
    @Field(() => String, {
        description: "Token id, use string-friendly format, if not found, we return a generated UUID instead",
    })
        id: string

    @Field(() => String, {
        description: "Token name",
        nullable: true,
    })
        name?: string

    @Field(() => String, {
        description: "Token symbol",
        nullable: true,
    })
        symbol?: string

    @Field(() => String, {
        description: "Token address",
        nullable: true,
    })
        address?: string

    @Field(() => String, {
        description: "Icon URL",
        nullable: true,
    })
        icon?: string

    @Field(() => GraphQLTypeTokenType, {
        description: "Token type",
        nullable: true,
    })
        type?: TokenType

    @Field(() => Int, {
        description: "Token decimals",
        nullable: true,
    })
        decimals?: number

    @Field(() => Float, {
        description: "Token price in USD",
        nullable: true,
    })
        priceInUSD?: number
}

@ObjectType({
    description: "Output tokens of the strategy",
})
export class OutputTokens {
    @Field(() => [GraphQLToken], {
        description: "Output tokens",
    })
        tokens: Array<GraphQLToken>
}

@ObjectType({
    description: "Statistical analysis of the strategy",
})
export class StrategyAnalysisField {
    @Field(() => Float, {
        description: "Confidence score of the strategy (0 to 1). In regression models, this is typically the R² value.",
        nullable: true,
    })
        confidenceScore?: number

    @Field(() => Float, {
        description: "Estimated daily growth rate in percentage. Positive means increase, negative means decrease.",
        nullable: true,
    })
        growthDaily?: number

    @Field(() => Float, {
        description: "Estimated weekly growth rate in percentage. Positive means increase, negative means decrease.",
        nullable: true,
    })
        growthWeekly?: number

    @Field(() => Float, {
        description: "Estimated monthly growth rate in percentage. Positive means increase, negative means decrease.",
        nullable: true,
    })
        growthMonthly?: number

    @Field(() => Float, {
        description: "Estimated yearly growth rate in percentage. Positive means increase, negative means decrease.",
        nullable: true,
    })
        growthYearly?: number
    intercept?: number
}

@ObjectType({
    description: "Statistical analysis of the strategy",
})
export class StrategyAnalysis {
    @Field(() => StrategyAnalysisField, {
        description: "Statistical analysis of the strategy",
        nullable: true,
    })
        tvlAnalysis?: StrategyAnalysisField

    @Field(() => StrategyAnalysisField, {
        description: "Statistical analysis of the strategy",
        nullable: true,
    })
        aprAnalysis?: StrategyAnalysisField

    @Field(() => StrategyAnalysisField, {
        description: "Statistical analysis of the strategy",
        nullable: true,
    })
        apyAnalysis?: StrategyAnalysisField

    @Field(() => StrategyAnalysisField, {
        description: "Share token price analysis",
        nullable: true,
    })
        shareTokenPriceAnalysis?: StrategyAnalysisField

    @Field(() => StrategyAnalysisField, {
        description: "Share token price analysis",
        nullable: true,
    })
        cTokenExchangeRateAnalysis?: StrategyAnalysisField
}

@ObjectType({
    description: "AI insights of the strategy",
})
export class StrategyAIInsights {
    @Field(() => String, {
        description: "AI insights of the strategy",
    })
        insights: string
    score?: number
}

@ObjectType({})
export class StrategyRewardToken {
    @Field(() => GraphQLToken, {
        description: "Reward token address",
    })
        token: GraphQLToken
    @Field(() => Float, {
        description: "Reward APR",
        nullable: true,
    })
        apr?: number
    @Field(() => Float, {
        description: "Reward amount per day",
        nullable: true,
    })
        rewardAmountPerDay?: number
    @Field(() => Float, {
        description: "Reward per share",
        nullable: true,
    })
        rewardPerShare?: number
}

@ObjectType({
    description: "Strategy rewards"
})
export class StrategyRewards {
    @Field(() => [StrategyRewardToken], {
        description: "Reward tokens of the strategy",
        nullable: true,
    })
        rewardTokens?: Array<StrategyRewardToken>
}

// @ObjectType({ description: "Atomic transaction in a strategy" })
// export class GraphQLTxAtom {
//   @Field(() => String, { description: "Transaction hash, optional", nullable: true })
//       hash?: string

//   @Field(() => String, { description: "Raw transaction payload for execution", nullable: true })
//       payload?: string
// }

// @ObjectType({
//     description: "Transaction"
// })
// export class GraphQLTransaction {
//     @Field(() => String, {
//         description: "Transaction batch id",
//     })
//         id: string
//     @Field(() => String, {
//         description: "Transaction batch name",
//         nullable: true,
//     })
//         name?: string
//     @Field(() => String, {
//         description: "Transaction batch description",
//         nullable: true,
//     })
//         description?: string
//     @Field(() => [GraphQLTxAtom], {
//         description: "Transactions in the batch",
//     })
//         transactions: Array<GraphQLTxAtom>
// }

// @ObjectType({
//     description: "Transaction"
// })
// export class GraphQLTransactions {
//     @Field(() => [GraphQLTransaction], {
//         description: "Transactions form this strategy",
//     })
//         transactions: Array<GraphQLTransaction>
// }

@ObjectType({
    description: "Strategy result"
})
export class StrategyResult {
    @Field(() => OutputTokens, {
        description: "Output tokens of the strategy",
    })
        outputTokens: OutputTokens
    @Field(() => YieldSummary, {
        description: "Yield summary of the strategy",
    })
        yieldSummary: YieldSummary

    @Field(() => StrategyAnalysis, {
        description: "Statistical analysis of the strategy",
        nullable: true,
    })
        strategyAnalysis?: StrategyAnalysis

    @Field(() => StrategyAIInsights, {
        description: "AI insights of the strategy",
        nullable: true,
    })
        strategyAIInsights?: StrategyAIInsights

    @Field(() => GraphQLJSON, {
        description: "Metadata of the strategy",
        nullable: true
    })
        metadata?: Record<string, Atomic>

    @Field(() => StrategyRewards, {
        description: "Rewards of the strategy",
        nullable: true,
    })
        rewards?: StrategyRewards

    // @Field(() => GraphQLTransactions, {
    //     description: "Transactions of the strategy",
    // })
    //     transactions: GraphQLTransactions
}