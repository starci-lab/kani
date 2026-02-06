import {
    ActionType
} from "@meteora-ag/dlmm"
import {
    AccountMeta
} from "@solana/kit"
import {
    RemainingAccountsInfoSlice
} from "@meteora-ag/dlmm"
import {
    BotSchema
} from "@modules/databases"
import {
    DlmmLiquidityPoolState
} from "../../../types"
import {
    Address
} from "@solana/kit"
import {
    StrategyParameters,
    LiquidityStrategyParameters
} from "@meteora-ag/dlmm"
import {
    bignum
} from "@metaplex-foundation/beet"
import {
    RemainingAccountsInfoType
} from "./close-position"

/**
 * Parameters for getting potential Token2022 instruction data and accounts.
 */
export interface GetPotentialToken2022IxDataAndAccountsParams {
    /** Action type. */
    actionType: ActionType
    /** Optional reward index. */
    rewardIndex?: number
}

/**
 * Result of getting potential Token2022 instruction data and accounts.
 */
export interface GetPotentialToken2022IxDataAndAccountsResult {
    /** Array of slices. */
    slices: Array<RemainingAccountsInfoSlice>
    /** Array of account metas. */
    accounts: Array<AccountMeta>
}

/**
 * Parameters for deposit with rebalance endpoint.
 */
export interface DepositWithRebalanceEndpointParams {
    /** Bot schema. */
    bot: BotSchema
    /** DLMM liquidity pool state. */
    state: DlmmLiquidityPoolState
    /** Strategy parameters. */
    strategy: StrategyParameters
    /** Slippage percentage. */
    slippagePercentage: number
    /** Max active bin slippage. */
    maxActiveBinSlippage: number
    /** Position address. */
    positionAddress: Address
    /** Position minimum bin ID. */
    positionMinBinId: number
    /** Position maximum bin ID. */
    positionMaxBinId: number
    /** Liquidity strategy parameters. */
    liquidityStrategyParameters: LiquidityStrategyParameters
    /** ATA address for token A. */
    ataAddressA: Address
    /** ATA address for token B. */
    ataAddressB: Address
}
