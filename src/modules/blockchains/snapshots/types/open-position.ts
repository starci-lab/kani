import type {
    ClientSession 
} from "mongoose"
import type BN from "bn.js"
import type {
    BotSchema,
    LiquidityPoolSchema,
    TokenSchema,
} from "@modules/databases"
import type {
    BalanceSnapshotParams 
} from "./balance"

/** CLMM-specific snapshot params (liquidity, tick range). */
export interface ClmmSnapshotParams {
    liquidity: BN
    tickLower: BN
    tickUpper: BN
}

/** DLMM-specific snapshot params (bin range). */
export interface DlmmSnapshotParams {
    minBinId: BN
    maxBinId: BN
}

/** Params for adding an open-position record with balance and protocol state. */
export interface AddOpenPositionRecordParams {
    clmmParams?: ClmmSnapshotParams
    dlmmParams?: DlmmSnapshotParams
    before: BalanceSnapshotParams
    after: BalanceSnapshotParams
    bot: BotSchema
    liquidityPool: LiquidityPoolSchema
    positionId: string
    openTxHashes: Array<string>
    metadata?: unknown
    session?: ClientSession
    targetToken: TokenSchema
    quoteToken: TokenSchema
    gasToken: TokenSchema
    rentAmount?: BN
}

/** Result of adding an open-position record (no payload). */
export type AddOpenPositionRecordResult = void
