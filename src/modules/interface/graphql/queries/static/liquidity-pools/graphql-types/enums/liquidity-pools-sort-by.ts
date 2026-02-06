import {
    registerEnumType,
} from "@nestjs/graphql"
import {
    createEnumType,
} from "@modules/common"

/** The field to sort the liquidity pools by. */
export enum LiquidityPoolsSortBy {
    Apr = "apr",
    Volume = "volume",
    Fees = "fees",
    Liquidity = "liquidity",
}

export const GraphQLTypeLiquidityPoolsSortBy = createEnumType(LiquidityPoolsSortBy)

registerEnumType(GraphQLTypeLiquidityPoolsSortBy,
    {
        name: "LiquidityPoolsSortBy",
        description: "The field to sort the liquidity pools by.",
        valuesMap: {
            [LiquidityPoolsSortBy.Apr]: {
                description: "The APR of the liquidity pool.",
            },
            [LiquidityPoolsSortBy.Volume]: {
                description: "The volume of the liquidity pool.",
            },
            [LiquidityPoolsSortBy.Fees]: {
                description: "The fees of the liquidity pool.",
            },
            [LiquidityPoolsSortBy.Liquidity]: {
                description: "The liquidity of the liquidity pool.",
            },
        },
    })
