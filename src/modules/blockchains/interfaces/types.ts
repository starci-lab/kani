import { Rewarder } from "@mmt-finance/clmm-sdk/dist/types"
import { ClmmPool } from "@flowx-finance/sdk"
import { BotSchema, LiquidityPoolId, LiquidityPoolSchema, TokenSchema } from "@modules/databases"
import BN from "bn.js"
import { DynamicDlmmLiquidityPoolInfo, DynamicLiquidityPoolInfo } from "../types"
import { Transaction } from "@mysten/sui/transactions"
import { FullySignedTransaction, TransactionWithinSizeLimit, TransactionWithBlockhashLifetime, TransactionMessageBytes, SignaturesMap } from "@solana/kit"

export interface FetchedPool {
    poolAddress: string
    displayId: LiquidityPoolId
    currentTick: number
    currentSqrtPrice: BN
    tickSpacing: number
    liquidityPool: LiquidityPoolSchema
    token0: TokenSchema
    token1: TokenSchema
    liquidity: BN
    fee: number
    rewardTokens: Array<TokenSchema>
    //extra required obj
    mmtRewarders?: Array<Rewarder>
    //flowx clmm pool
    flowXClmmPool?: ClmmPool
}

export interface FetchedPosition {
    id: string
    tickLowerIndex: number
    tickUpperIndex: number
    liquidity: string
}

// Common types shared between open and close position
export interface LiquidityPoolState {
    static: LiquidityPoolSchema;
    dynamic: DynamicLiquidityPoolInfo;
}

export interface DlmmLiquidityPoolState {
    static: LiquidityPoolSchema;
    dynamic: DynamicDlmmLiquidityPoolInfo;
}

export interface PrepareOpenPositionParams {
    bot: BotSchema;
    state: LiquidityPoolState | DlmmLiquidityPoolState;
}


export interface PrepareClosePositionParams {
    bot: BotSchema;
    state: LiquidityPoolState | DlmmLiquidityPoolState;
}

export interface PrepareClosePositionResponse {
    txHash: string;
    txb?: Transaction;
    solanaTx?: SolanaTx;
}

export type SolanaTx = FullySignedTransaction & Readonly<TransactionWithinSizeLimit & TransactionWithBlockhashLifetime & Readonly<{
    messageBytes: TransactionMessageBytes;
    signatures: SignaturesMap;
}>>
