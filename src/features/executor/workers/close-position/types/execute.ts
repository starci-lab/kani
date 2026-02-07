import type {
    ProcessParams,
} from "./process"
import type {
    ClosePositionJobData 
} from "./data"

/** Params for the EXECUTE phase. */
export interface ExecuteParams extends ProcessParams {
    /** Output of prepare() (prepared close-position transaction + optional metadata). */
    prepareResult: ClosePositionJobData
}

/** Result of the EXECUTE phase. */
export interface ExecuteResult {
    result: ClosePositionJobData
}
