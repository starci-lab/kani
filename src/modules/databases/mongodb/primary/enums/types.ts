import { registerEnumType } from "@nestjs/graphql"
import { createEnumType } from "@utils"

export enum OauthProviderName {
    Google = "google",
    Facebook = "facebook",
    X = "x"
}

export const GraphQLTypeOauthProviderName = createEnumType(OauthProviderName)

registerEnumType(GraphQLTypeOauthProviderName, {
    name: "OauthProviderName",
    description: "The name of the oauth provider",
    valuesMap: {
        [OauthProviderName.Google]: {
            description: "The google oauth provider"
        },
        [OauthProviderName.Facebook]: {
            description: "The facebook oauth provider"
        },
        [OauthProviderName.X]: {
            description: "The x oauth provider"
        }
    }
})

export enum LiquidityPoolType {
    Clmm = "clmm",
    Dlmm = "dlmm",
}

export const GraphQLTypeLiquidityPoolType = createEnumType(LiquidityPoolType)

registerEnumType(GraphQLTypeLiquidityPoolType, {
    name: "LiquidityPoolType",
    description: "The type of the liquidity pool",
    valuesMap: {
        [LiquidityPoolType.Clmm]: {
            description: "The clmm liquidity pool"
        },
        [LiquidityPoolType.Dlmm]: {
            description: "The dlmm liquidity pool"
        },
    }
})

export enum QuoteRatioStatus {
    Good = "good",
    TargetTooLow = "targetTooLow",
    TargetTooHigh = "targetTooHigh",
}

export const GraphQLTypeQuoteRatioStatus = createEnumType(QuoteRatioStatus)

registerEnumType(GraphQLTypeQuoteRatioStatus, {
    name: "QuoteRatioStatus",
    description: "The status of the quote ratio",
    valuesMap: {
        [QuoteRatioStatus.Good]: {
            description: "The quote ratio is good"
        },
        [QuoteRatioStatus.TargetTooLow]: {
            description: "The quote ratio is too low"
        },
        [QuoteRatioStatus.TargetTooHigh]: {
            description: "The quote ratio is too high"
        }
    }
})

export enum BotType {
    Standard = "standard",   
    Privy = "privy",
}

export const GraphQLTypeBotType = createEnumType(BotType)

registerEnumType(GraphQLTypeBotType, {
    name: "BotType",
    description: `
      Defines where a bot’s private keys are stored, determining its security and access model.
      
      Use this enum when specifying how the bot should handle private-key storage.
    `.trim(),
    valuesMap: {
        [BotType.Standard]: {
            description: "Private keys are stored in the application database — suitable for most default bots.",
        },
        [BotType.Privy]: {
            description: "Private keys are stored in Privy — used for bots requiring enhanced security or restricted access.",
        }
    }
})