import type {
    ProcessParams, ProcessResult 
} from "./process"
import type {
    PrepareResult 
} from "./prepare"

/** Params for the EXECUTE phase. */
export interface ExecuteParams extends ProcessParams {
    /** Output of prepare() (prepared close-position transaction + optional metadata). */
    prepareResult: PrepareResult
}

/** Result of the EXECUTE phase. */
export type ExecuteResult = ProcessResult
