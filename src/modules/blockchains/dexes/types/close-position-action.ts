import {
    BotSchema 
} from "@modules/databases"
import {
    LiquidityPoolState 
} from "../../types"
import {
    LiquidityPoolSchema
} from "@modules/databases"
import {
    SignedTx
} from "../../types"

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
    signedTxs: Array<SignedTx>
}

/**
 * Result of executing a close position transaction.
 */
export interface ExecuteClosePositionResult {
    txHashes: Array<string>
}

/**
 * Parameters for executing a close position transaction.
 */
export interface ExecuteClosePositionParams {
    bot: BotSchema
    state: LiquidityPoolState
    txCheck: boolean
    signedTxs: Array<SignedTx>
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
}
