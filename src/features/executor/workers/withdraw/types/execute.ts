import type {
    ProcessParams, ProcessResult 
} from "./process"
import type {
    WithdrawJobData 
} from "./data"

/** Params for the EXECUTE phase. */
export interface ExecuteParams extends ProcessParams {
    /** Output of prepare() (prepared swap transactions + optional metadata). */
    prepareResult: WithdrawJobData
}

/** Result of the EXECUTE phase. */
export type ExecuteResult = ProcessResult
