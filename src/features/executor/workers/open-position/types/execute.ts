import type {
    PrepareResult,
} from "./prepare"
import type {
    ProcessParams, ProcessResult 
} from "./process"

/** Params for the EXECUTE phase. */
export type ExecuteParams = ProcessParams & {
    /** Output of prepare() (prepared open-position transaction + optional metadata). */
    prepareResult: PrepareResult
}

/** Result of the EXECUTE phase. */
export type ExecuteResult = ProcessResult
