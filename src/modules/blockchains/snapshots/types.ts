import {
    ClientSession 
} from "mongoose"
import BN from "bn.js"
import {
    BotSchema,
    TokenSchema,
    LiquidityPoolSchema,
    TransactionType,
} from "@modules/databases"
import {
    ChainId 
} from "@modules/typedefs"

export interface BalanceSnapshotParams {
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
}

export interface ClmmSnapshotParams {
    liquidity: BN
    tickLower: BN
    tickUpper: BN
}

export interface DlmmSnapshotParams {
    minBinId: BN
    maxBinId: BN
}

export interface AddOpenPositionRecordParams {
    // Protocol-specific params
    clmmParams?: ClmmSnapshotParams
    dlmmParams?: DlmmSnapshotParams
    // Snapshot fields
    before: BalanceSnapshotParams
    after: BalanceSnapshotParams
    // Common fields
    bot: BotSchema
    liquidityPool: LiquidityPoolSchema
    positionId: string
    openTxHash: string
    metadata?: unknown
    feeTargetAmount: BN
    feeQuoteAmount: BN
    session?: ClientSession
    targetToken: TokenSchema
    quoteToken: TokenSchema
    gasToken: TokenSchema
    stimulate?: boolean
}

export interface UpdateClosePositionRecordParams {
    before: BalanceSnapshotParams
    after: BalanceSnapshotParams
    // Common fields
    positionId: string
    closeTxHash: string
    session?: ClientSession
    targetToken: TokenSchema
    quoteToken: TokenSchema
    gasToken: TokenSchema
    stimulate?: boolean
}

export interface AddTransactionRecordParams {
    bot: BotSchema
    session?: ClientSession
    txHash: string
    chainId: ChainId
    type: TransactionType
    isStimulated?: boolean
}

export interface UpdateBotSnapshotBalancesRecordParams {
    bot: BotSchema
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
    session?: ClientSession
}
