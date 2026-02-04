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
    incentiveBalanceAmounts?: Record<string, BN>
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
    openTxHashes: Array<string>
    metadata?: unknown
    feeTargetAmount: BN
    feeQuoteAmount: BN
    session?: ClientSession
    targetToken: TokenSchema
    quoteToken: TokenSchema
    gasToken: TokenSchema
}

export interface UpdateClosePositionRecordParams {
    before: BalanceSnapshotParams
    after: BalanceSnapshotParams
    // Common fields
    positionId: string
    closeTxHashes: Array<string>
    session?: ClientSession
    targetToken: TokenSchema
    quoteToken: TokenSchema
    gasToken: TokenSchema
}

export interface AddTransactionRecordParams {
    bot: BotSchema
    session?: ClientSession
    txHash: string
    chainId: ChainId
    type: TransactionType
}

export interface UpdateBotSnapshotBalancesRecordParams {
    bot: BotSchema
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
    incentiveBalanceAmounts?: Record<string, BN>
    session?: ClientSession
}
