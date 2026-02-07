import type {
    ProcessParams 
} from "./process"
import type {
    ExecuteResult,
} from "./execute"

/** Params for the CONFIRM phase. */
export interface ConfirmParams extends ProcessParams {
    /** Output of execute() (includes transactionRecords for snapshotting). */
    executeResult: ExecuteResult
}

/** Result of the CONFIRM phase. */
export type ConfirmResult = void   