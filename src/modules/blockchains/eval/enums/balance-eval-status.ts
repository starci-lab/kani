import {
    createEnumType
} from "@modules/common"
import {
    registerEnumType
} from "@nestjs/graphql"

/**
 * Balance evaluation status returned by EvalBalanceService.
 */
export enum BalanceEvalStatus {
    /** The balance is sufficient. */
    Ok = "ok",
    /** The bot is in a position. */
    InPosition = "inPosition",
    /** The balance is insufficient. */
    InsufficientFunding = "insufficientFunding",
    /** The gas is insufficient. */
    InsufficientGas = "insufficientGas",
    /** The target is underweighted. */
    TargetUnderweighted = "targetUnderweighted",
    /** The target is overweighted. */
    TargetOverweighted = "targetOverweighted",
}

/**
 * GraphQL enum type for BalanceEvalStatus.
 */
export const GraphQLTypeBalanceEvalStatus = createEnumType(
    BalanceEvalStatus,
)

registerEnumType(
    GraphQLTypeBalanceEvalStatus,
    {
        name: "BalanceEvalStatus",
        description:
            "Balance evaluation status returned by EvalBalanceService.",
        valuesMap: {
            [BalanceEvalStatus.Ok]: {
                description: "The balance is sufficient",
            },
            [BalanceEvalStatus.InPosition]: {
                description: "The bot is in a position",
            },
            [BalanceEvalStatus.InsufficientFunding]: {
                description: "The balance is insufficient",
            },
            [BalanceEvalStatus.InsufficientGas]: {
                description: "The gas is insufficient",
            },
            [BalanceEvalStatus.TargetUnderweighted]: {
                description: "The target is underweighted",
            },
            [BalanceEvalStatus.TargetOverweighted]: {
                description: "The target is overweighted",
            },
        }
    }
)
