import type {
    ChainId 
} from "@modules/common"
import type {
    LiquidityPoolId,
    TokenId,
    TransactionType
} from "@modules/databases"

export interface ClosePositionTransactionExecutedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

export interface ClosePositionTransactionFailedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

export interface LiquidityPoolFetchedErrorMessage {
    liquidityPoolId: LiquidityPoolId
    error: string
}

export interface LiquidityPoolUpdatedMessage {
    liquidityPoolId: LiquidityPoolId
}

export interface PoolAnalyticsUpdatedMessage {
    liquidityPoolId: LiquidityPoolId
}

export interface LiquidityPoolWsErrorMessage {
    liquidityPoolId: LiquidityPoolId
    error: string
}

export interface OpenPositionTransactionExecutedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

export interface OpenPositionTransactionFailedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

export interface SwapTransactionExecutedMessage {
    botId: string
    txHash: string
}

export interface SwapTransactionFailedMessage {
    botId: string
    txHash: string
    tokenIn: TokenId
    tokenOut: TokenId
    error: string
}

export interface SwapTransactionStimulatedMessage {
    botId: string
    txHash: string
}

export interface SwapTransactionPreparedMessage {
    botId: string
    txHashes: Array<string>
}

export interface SwapTransactionFoundMessage {
    botId: string
    txHash: string
}

export interface OpenPositionTransactionStimulatedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

export interface ClosePositionTransactionStimulatedMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

export interface ClosePositionTransactionFoundMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

export interface OpenPositionTransactionFoundMessage {
    botId: string
    txHash: string
    liquidityPoolId: LiquidityPoolId
}

export interface ClosePositionTransactionPreparedMessage {
    botId: string
    txHashes: Array<string>
    liquidityPoolId: LiquidityPoolId
}

export interface ReconcileBalancePreparedMessage {
    botId: string
    txHashes: Array<string>
}

export interface WithdrawPreparedMessage {
    botId: string
    txHashes: Array<string>
}

export interface WithdrawTransactionExecutedMessage {
    botId: string
    txHash: string
}

export interface WithdrawTransactionStimulatedMessage {
    botId: string
    txHash: string
}

export interface ReconcileBalanceTransactionExecutedMessage {
    botId: string
    txHash: string
}

export interface ReconcileBalanceTransactionStimulatedMessage {
    botId: string
    txHash: string
}

export interface WithdrawTransactionPreparedMessage {
    botId: string
    txHashes: Array<string>
}

export interface WithdrawTransactionFoundMessage {
    botId: string
    txHash: string
}

export interface ReconcileBalanceTransactionFoundMessage {
    botId: string
    txHash: string
}

/** Message for transaction stimulation */
export interface TransactionStimulatedMessage {
    /** Bot ID */
    botId: string
    /** Transaction hash */
    txHash: string
    /** Liquidity pool ID */
    liquidityPoolId?: LiquidityPoolId
    /** Transaction type */
    type: TransactionType
    /** Chain ID */
    chainId: ChainId
}

/** Message for transaction execution */
export interface TransactionExecutedMessage {
    /** Bot ID */
    botId: string
    /** Transaction hash */
    txHash: string
    /** Liquidity pool ID */
    liquidityPoolId?: LiquidityPoolId
    /** Transaction type */
    type: TransactionType
    /** Chain ID */
    chainId: ChainId
}


/**
 * Transaction signed message.
 */
export interface TransactionSignedMessage {
    /** Bot ID. */
    botId: string
    /** Transaction hash. */
    txHash: string
    /** Chain ID. */
    chainId: ChainId
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
    /** Transaction type. */
    type: TransactionType
}

/**
 * Transaction signed failed message.
 */
export interface TransactionSignedFailedMessage {
    /** Bot ID. */
    botId: string
    /** Error. */
    error: string
    /** Chain ID. */
    chainId: ChainId
    /** Liquidity pool ID. */
    liquidityPoolId?: LiquidityPoolId
    /** Transaction type. */
    type: TransactionType
}