import {
    BotSchema 
} from "@modules/databases"
import {
    LiquidityPoolState, 
    PrepareTx,
    SignedTx,
} from "../../types"
import {
    LiquidityPoolSchema
} from "@modules/databases"
import {
    SignClosePositionParams, SignClosePositionResult 
} from "./open-position-action"
/**
 * Parameters for preparing a close position transaction.
 */
export interface PrepareClosePositionParams {
    bot: BotSchema
    state: LiquidityPoolState
    liquidityPool: LiquidityPoolSchema
}

/**
 * Result of preparing a close position transaction.
 */
export interface PrepareClosePositionResult {
    prepareTxs: Array<PrepareTx>
}

/**
 * Result of executing a close position transaction.
 */
export interface ExecuteClosePositionResult {
    txHash: string
}

/**
 * Parameters for executing a close position transaction.
 */
export interface ExecuteClosePositionParams {
    bot: BotSchema
    state: LiquidityPoolState
    txCheck: boolean
    signedTx: SignedTx
    stimulate?: boolean
    liquidityPool: LiquidityPoolSchema
}

/**
 * Service interface for close position actions.
 */
export interface IClosePositionActionService {
    prepare(
        params: PrepareClosePositionParams,
    ): Promise<PrepareClosePositionResult>
    execute(
        params: ExecuteClosePositionParams,
    ): Promise<ExecuteClosePositionResult>
    sign(
        params: SignClosePositionParams,
    ): Promise<SignClosePositionResult>
}
