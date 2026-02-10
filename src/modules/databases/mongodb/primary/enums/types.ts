import {
    registerEnumType 
} from "@nestjs/graphql"
import {
    createEnumType 
} from "@modules/common"
import ms from "ms"

export enum LiquidityPoolType {
    Clmm = "clmm",
    Dlmm = "dlmm",
}

export const GraphQLTypeLiquidityPoolType = createEnumType(LiquidityPoolType)

registerEnumType(GraphQLTypeLiquidityPoolType,
    {
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
    TargetUnderweighted = "targetUnderweighted",
    TargetOverweighted  = "targetOverweighted",
}
export const GraphQLTypeQuoteRatioStatus = createEnumType(QuoteRatioStatus)

registerEnumType(GraphQLTypeQuoteRatioStatus,
    {
        name: "QuoteRatioStatus",
        description: "The status of the quote ratio",
        valuesMap: {
            [QuoteRatioStatus.Good]: {
                description: "The quote ratio is good"
            },
            [QuoteRatioStatus.TargetUnderweighted]: {
                description: "The quote ratio is underweighted"
            },
            [QuoteRatioStatus.TargetOverweighted]: {
                description: "The quote ratio is overweighted"
            }
        }
    }
)

export enum BotType {
    Standard = "standard",
    Privy = "privy",
}

export const GraphQLTypeBotType = createEnumType(BotType)

registerEnumType(GraphQLTypeBotType,
    {
        name: "BotType",
        description: `
      Defines where a bot's private keys are stored, determining its security and access model.
      
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
    OpenPosition = "openPosition",
    ClosePosition = "closePosition",
    ReconcileBalance = "reconcileBalance",
    Withdraw = "withdraw",
}

export const GraphQLTypeTransactionType = createEnumType(TransactionType)

registerEnumType(
    GraphQLTypeTransactionType,
    {
        name: "TransactionType",
        description: "The type of the transaction",
        valuesMap: {
            [TransactionType.OpenPosition]: {
                description: "The open position transaction"
            },
            [TransactionType.ClosePosition]: {
                description: "The close position transaction"
            },
            [TransactionType.ReconcileBalance]: {
                description: "The reconcile balance transaction"
            },
            [TransactionType.Withdraw]: {
                description: "The withdraw transaction"
            }
        }
    }
)

export enum JobType {
    OpenPosition = "openPosition",
    ClosePosition = "closePosition",
    ReconcileBalance = "reconcileBalance",
    Withdraw = "withdraw",
}

export const GraphQLTypeJobType = createEnumType(JobType)

registerEnumType(GraphQLTypeJobType,
    {
        name: "JobType",
        description: "The type of the job",
        valuesMap: {
            [JobType.OpenPosition]: {
                description: "The open position job"
            },
            [JobType.ClosePosition]: {
                description: "The close position job"
            },
            [JobType.ReconcileBalance]: {
                description: "The reconcile balance job"
            },
            [JobType.Withdraw]: {
                description: "The withdraw job"
            }
        }
    })

export enum JobStatus {
    Pending = "pending",
    Prepared = "prepared",
    Executed = "executed",
    Confirmed = "confirmed",
    Completed = "completed",
    Cleared = "cleared",
    Failed = "failed",
}

export const GraphQLTypeJobStatus = createEnumType(JobStatus)

registerEnumType(GraphQLTypeJobStatus,
    {
        name: "JobStatus",
        description: "Represents the lifecycle status of a background job",
        valuesMap: {
            [JobStatus.Pending]: {
                description: "The job has been created but not processed yet",
            },
            [JobStatus.Prepared]: {
                description: "The job has been prepared",
            },
            [JobStatus.Executed]: {
                description: "The job has been executed",
            },
            [JobStatus.Completed]: {
                description: "The job has been completed",
            },
            [JobStatus.Cleared]: {
                description: "The job has been cleared",
            },
            [JobStatus.Failed]: {
                description: "The job has failed",
            },
        },
    }
)

export enum AppVersion {
    V1 = "v1",
    V2 = "v2",
}

export const GraphQLTypeAppVersion = createEnumType(AppVersion)

registerEnumType(
    GraphQLTypeAppVersion,
    {
        name: "AppVersion",
        description: "The version of the app",
        valuesMap: {
            [AppVersion.V1]: {
                description: "The app version 1, use encrypted private key to process transactions"
            },
            [AppVersion.V2]: {
                description: "The app version 2, use privy signer to process transactions"
            }
        }
    }
)

export enum PositionSettlementReason {
    OutOfRange = "outOfRange",
}
export const GraphQLTypePositionSettlementReason = createEnumType(PositionSettlementReason)

registerEnumType(
    GraphQLTypePositionSettlementReason,
    {
        name: "PositionSettlementReason",
        description: "The reason for the settlement",
        valuesMap: {
            [PositionSettlementReason.OutOfRange]: {
                description: "The position is settled out of range"
            }
        }
    }
)

export enum PerformanceDisplayMode {
    Target = "target",
    Usd = "usd",
}
export const GraphQLTypePerformanceDisplayMode = createEnumType(PerformanceDisplayMode)

registerEnumType(GraphQLTypePerformanceDisplayMode,
    {
        name: "PerformanceDisplayMode",
        description: "The display mode of the bot's performance",
        valuesMap: {
            [PerformanceDisplayMode.Target]: {
                description: "The performance is displayed in target units"
            },
            [PerformanceDisplayMode.Usd]: {
                description: "The performance is displayed in USD units"
            }
        }
    }
)

export enum ChartInterval {
    FifteenMinutes = "fifteenMinutes",
    ThirtyMinutes = "thirtyMinutes",
    OneHour = "oneHour",
    TwoHours = "twoHours",
    FourHours = "fourHours",
    Day = "day",
}

export const GraphQLTypeChartInterval = createEnumType(ChartInterval)

registerEnumType(GraphQLTypeChartInterval,
    {
        name: "ChartInterval",
        description: "The interval of the chart.",
        valuesMap: {
            [GraphQLTypeChartInterval.FifteenMinutes]: {
                description: "15 minutes",
            },
            [GraphQLTypeChartInterval.ThirtyMinutes]: {
                description: "30 minutes",
            },
            [GraphQLTypeChartInterval.OneHour]: {
                description: "1 hour",
            },
            [GraphQLTypeChartInterval.TwoHours]: {
                description: "2 hours",
            },
            [GraphQLTypeChartInterval.FourHours]: {
                description: "4 hours",
            },
            [GraphQLTypeChartInterval.Day]: {
                description: "1 day",
            },
        },
    })

export const chartIntervalToMsString = (
    interval: ChartInterval
): ms.StringValue => {
    const map: Record<ChartInterval, ms.StringValue> = {
        [ChartInterval.FifteenMinutes]: "15m",
        [ChartInterval.ThirtyMinutes]: "30m",
        [ChartInterval.OneHour]: "1h",
        [ChartInterval.TwoHours]: "2h",
        [ChartInterval.FourHours]: "4h",
        [ChartInterval.Day]: "1d",
    }
    return map[interval]
}

export enum ChartUnit {
    Usd = "usd",
    Target = "target",
}

export const GraphQLTypeChartUnit = createEnumType(ChartUnit)

registerEnumType(GraphQLTypeChartUnit,
    {
        name: "ChartUnit",
        description: "The unit of the chart.",
        valuesMap: {
            [GraphQLTypeChartUnit.Usd]: {
                description: "USD",
            },
            [GraphQLTypeChartUnit.Target]: {
                description: "Target",
            },
        },
    }
)

export enum BotStatus {
    InRange = "inRange",
    OutOfRange = "outOfRange",
    Idle = "idle",
}
export const GraphQLTypeBotStatus = createEnumType(BotStatus)

registerEnumType(GraphQLTypeBotStatus,
    {
        name: "BotStatus",
        description: "The status of the bot",
        valuesMap: {
            [BotStatus.InRange]: {
                description: "The bot is in range"
            },
            [BotStatus.OutOfRange]: {
                description: "The bot is out of range"
            },
            [BotStatus.Idle]: {
                description: "The bot is idle"
            }
        }
    }
)

export enum AuthenticationFactor {
    TOTP = "totp",
}
export const GraphQLTypeAuthenticationFactor = createEnumType(AuthenticationFactor)

registerEnumType(GraphQLTypeAuthenticationFactor,
    {
        name: "AuthenticationFactor",
        description: "The factor of authentication",
        valuesMap: {
            [AuthenticationFactor.TOTP]: {
                description: "The authentication factor is TOTP"
            },
        }
    }
)