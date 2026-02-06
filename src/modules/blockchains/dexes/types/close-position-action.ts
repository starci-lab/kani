import {
    BotSchema 
} from "@modules/databases"
import {
    LiquidityPoolState 
} from "./pool-state"
import {
    PrepareTx
} from "../../types/transactions"

/**
 * Parameters for preparing a close position transaction.
 */
export interface PrepareClosePositionParams {
    bot: BotSchema
    state: LiquidityPoolState
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
    txHashes: Array<string>
}

/**
 * Parameters for executing a close position transaction.
 */
export interface ExecuteClosePositionParams {
    bot: BotSchema
    state: LiquidityPoolState
    txCheck: boolean
    prepareTxs: Array<PrepareTx>
    stimulate?: boolean
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
