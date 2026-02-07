import type {
    ProcessParams 
} from "./process"
import type {
    WithdrawJobData 
} from "./data"

/** Params for the CONFIRM phase. */
export interface ConfirmParams extends ProcessParams {
    /** Output of execute() (includes transactionRecords for snapshotting). */
    executeResult: WithdrawJobData
}
