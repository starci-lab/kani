import BN from "bn.js"
import {
    WithdrawCacheResult
} from "@modules/cache"
import {
    LiquidityPoolState
} from "./pool-state"

/** Base payload for all job types. */
export interface BasePayload {
    jobId: string
    botId: string
    isRetry?: boolean
}

/** Payload for open position jobs. */
export interface OpenPositionPayload extends BasePayload {
    liquidityPoolId: string
    state?: LiquidityPoolState
}

/** Payload for close position jobs. */
export interface ClosePositionPayload extends BasePayload {
    liquidityPoolId: string
    state?: LiquidityPoolState
}

/** Payload for reconcile balance jobs. */
export interface ReconcileBalancePayload extends BasePayload {
    targetBalanceAmount?: BN
    quoteBalanceAmount?: BN
    gasBalanceAmount?: BN
}

/** Input for withdrawing tokens. */
export interface WithdrawTokenInput {
    tokenId: string
    amount: BN
}

/** Payload for withdraw jobs. */
export interface WithdrawPayload extends BasePayload {
    payload: WithdrawCacheResult
}
