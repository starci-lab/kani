
import { BotSchema, TokenId } from "@modules/databases"
import BN from "bn.js"
import Decimal from "decimal.js"
import { UpdateBotSnapshotBalancesRecordParams, AddSwapTransactionRecordParams } from "../snapshots"

/**
 * The core interface for any swap aggregator (Jupiter, Meteora, Raydium, etc.).
 * It returns a quote + executable swap data.
 */
export interface IBalanceService {
    executeBalanceRebalancing(params: ExecuteBalanceRebalancingParams): Promise<ExecuteBalanceRebalancingResponse>
    fetchBalances(params: FetchBalancesParams): Promise<FetchBalancesResponse>
    fetchBalance(params: FetchBalanceParams): Promise<FetchBalanceResponse>
}

export interface FetchBalanceParams {
    bot: BotSchema
    tokenId: TokenId
}

export interface FetchBalanceResponse {
    balanceAmount: BN
}

export interface ExecuteBalanceRebalancingParams {
    bot: BotSchema
    clientIndex?: number
    withoutSnapshot?: boolean
}

export interface ExecuteBalanceRebalancingResponse {
    balancesSnapshotsParams?: UpdateBotSnapshotBalancesRecordParams
    swapsSnapshotsParams?: AddSwapTransactionRecordParams
}

export enum ExecuteBalanceRebalancingStatus {
    OK = "ok",
    InsufficientTargetBalance = "InsufficientTargetBalance",
    InsufficientGasBalance = "InsufficientGasBalance",
    GasLowButConvertible = "GasLowButConvertible",
}

export enum GasStatus {
    IsTarget = "isTarget",
    IsQuote = "isQuote",
    IsGas = "isGas",
}

export interface FetchBalancesParams {
    bot: BotSchema
    clientIndex?: number
}

export interface FetchBalancesResponse {
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount?: BN
}

export interface ProcessTransferFeesTransactionParams {
    bot: BotSchema
    roi: Decimal
    clientIndex?: number
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
}

export interface ProcessTransferFeesResponse {
    txHash: string
    targetFeeAmount: BN
    quoteFeeAmount: BN
}