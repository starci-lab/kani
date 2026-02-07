import type {
    ProcessParams 
} from "./process"
import type {
    ClosePositionJobData 
} from "./data"

/** Params for the CONFIRM phase. */
export interface ConfirmParams extends ProcessParams {
    /** Output of execute() (includes transactionRecords for snapshotting). */
    executeResult: ClosePositionJobData
}

/** Result of the CONFIRM phase. */
export interface ConfirmResult {
    result: ClosePositionJobData
}
