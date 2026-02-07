import type {
    ProcessParams, ProcessResult 
} from "./process"
import {
    PrepareResult 
} from "./prepare"

/** Params for the EXECUTE phase. */
export interface ExecuteParams extends ProcessParams {
    /** Output of prepare() (prepared swap transactions + optional metadata). */
    prepareResult: PrepareResult
}

/** Result of the EXECUTE phase. */
export type ExecuteResult = ProcessResult
