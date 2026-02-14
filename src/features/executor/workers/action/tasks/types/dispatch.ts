import {
    PrepareTx 
} from "@modules/blockchains"

/**
 * Parameters for the dispatch of a task.
 */
export interface IDispatchPayload {
    prepareTxs: Array<PrepareTx>
}