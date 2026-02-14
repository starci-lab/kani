import BN from "bn.js"
import {
    BotSchema,
    LiquidityPoolSchema,
} from "@modules/databases"
import {
    Decimal 
} from "decimal.js"
import {
    LiquidityPoolState,
    PrepareTx,
    SignedTx,
    SolanaTx
} from "../../types"
/**
 * Parameters for preparing an open position transaction.
 */
export interface PrepareOpenPositionParams {
    bot: BotSchema
    state: LiquidityPoolState
    liquidityPool: LiquidityPoolSchema
}

/**
 * Result of preparing an open position transaction.
 */
export interface PrepareOpenPositionResult {
    prepareTxs: Array<PrepareTx>
    feeAmountA: BN
    feeAmountB: BN
    tickLower?: BN
    tickUpper?: BN
    amountA?: BN
    amountB?: BN
    minBinId?: BN
    maxBinId?: BN
    metadata?: unknown
    positionId?: string
}

/**
 * Parameters for executing an open position transaction.
 */
export interface ExecuteOpenPositionParams {
    bot: BotSchema
    state: LiquidityPoolState
    txCheck: boolean
    signedTx: SignedTx
    positionId?: string
    stimulate?: boolean
    liquidityPool: LiquidityPoolSchema
}

/**
 * Result of executing an open position transaction.
 */
export interface ExecuteOpenPositionResult {
    positionId: string
    txHash: string
} 

/**
 * Service interface for open position actions.
 */
export interface IOpenActionService {
    prepare(
        params: PrepareOpenPositionParams,
    ): Promise<PrepareOpenPositionResult>
    // open position
    execute(
        params: ExecuteOpenPositionParams,
    ): Promise<ExecuteOpenPositionResult>
    // confirm open position
    confirm(
        params: ConfirmOpenPositionParams,
    ): Promise<ConfirmOpenPositionResult>
}

/**
 * Result of creating and executing an open position.
 */
export interface CreateExecuteResult {
    metadata?: unknown
    // fee amount in target token
    feeAmountTarget: BN
    // fee amount in quote token
    feeAmountQuote: BN
    // position id
    positionId: string
    // liquidity
    liquidity?: BN
    // tick lower
    tickLower?: Decimal
    // tick upper
    tickUpper?: Decimal
    // bin min id
    minBinId?: Decimal
    // bin max id
    maxBinId?: Decimal
    // amount a
    amountA?: BN
    // amount b
    amountB?: BN
}

/**
 * Parameters for confirming an open position.
 */
export interface ConfirmOpenPositionParams {
    bot: BotSchema
    positionId: string
    state: LiquidityPoolState
    liquidityPool: LiquidityPoolSchema
}

/**
 * Result of confirming an open position.
 */
export interface ConfirmOpenPositionResult {
    liquidity?: BN
}

/**
 * Parameters for signing an open position.
 */
export interface SignOpenPositionParams {
    /* Liquidity pool */
    liquidityPool: LiquidityPoolSchema
    /* Prepared transaction */
    prepareTx: PrepareTx
    /* Bot */
    bot: BotSchema
}

/**
 * Result of signing an open position.
 */
export interface SignOpenPositionResult {
    signedTx: SignedTx
}
    
/**
 * Parameters for signing an open position.
 */
export interface SignClosePositionParams {
    liquidityPool: LiquidityPoolSchema
    prepareTx: PrepareTx
    bot: BotSchema
}

/**
 * Result of signing an open position.
 */
export interface SignClosePositionResult {
    signedTx: SignedTx
}

/**
 * Serialized transaction for open position.
 */
export interface OpenPositionSerializedTx {
    // solana transaction
    solanaTx: SolanaTx
    // position keypair private key
    positionKeyPairPrivateKey: Array<number>
}