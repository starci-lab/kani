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

export enum TransactionType {
    Swap = "swap",
    OpenPosition = "openPosition",
    ClosePosition = "closePosition",
}

export const GraphQLTypeTransactionType = createEnumType(TransactionType)

registerEnumType(
    GraphQLTypeTransactionType, {
        name: "TransactionType",
        description: "The type of the transaction",
        valuesMap: {
            [TransactionType.Swap]: {
                description: "The swap transaction"
            },
            [TransactionType.OpenPosition]: {
                description: "The open position transaction"
            },
            [TransactionType.ClosePosition]: {
                description: "The close position transaction"
            }
        }
    }
)

export enum JobType {
    OpenPosition = "openPosition",
    ClosePosition = "closePosition",
    Swap = "swap",
}

export const GraphQLTypeJobType = createEnumType(JobType)

registerEnumType(GraphQLTypeJobType, {
    name: "JobType",
    description: "The type of the job",
    valuesMap: {
        [JobType.OpenPosition]: {
            description: "The open position job"
        },
        [JobType.ClosePosition]: {
            description: "The close position job"
        },
        [JobType.Swap]: {
            description: "The swap job"
        }
    }
})

export enum JobStatus {
    Pending = "pending",
  
    TxHashSaved = "tx_hash_saved",   // transaction hash stored (before sending to chain)
    TxExecuted = "tx_executed",      // transaction sent and executed on chain
    DbPersisted = "db_persisted",    // job result persisted in database
  
    Completed = "completed",         // job fully completed
    Failed = "failed",               // job failed
  }
  
export const GraphQLTypeJobStatus = createEnumType(JobStatus)
  
registerEnumType(GraphQLTypeJobStatus, {
    name: "JobStatus",
    description: "Represents the lifecycle status of a background job",
    valuesMap: {
        [JobStatus.Pending]: {
            description: "The job has been created but not processed yet",
        },
        [JobStatus.TxHashSaved]: {
            description: "The transaction hash has been saved before sending the transaction to the blockchain",
        },
        [JobStatus.TxExecuted]: {
            description: "The transaction has been sent and executed on the blockchain",
        },
        [JobStatus.DbPersisted]: {
            description: "The job result has been persisted to the database",
        },
        [JobStatus.Completed]: {
            description: "The job has been fully completed",
        },
        [JobStatus.Failed]: {
            description: "The job has failed",
        },
    },
})