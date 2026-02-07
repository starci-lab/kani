import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Thrown when wait condition is not met (used to trigger retry) */
export type WaitConditionNotMetExceptionMetadata = AbstractExceptionMetadata & {
    reason?: string
}

/** Thrown when wait condition is not met. */
export class WaitConditionNotMetException extends AbstractException {
    constructor(
        {
            reason,
            originalError,
        }: WaitConditionNotMetExceptionMetadata = {
        }
    ) {
        super(
            "Wait condition not met",
            "WAIT_CONDITION_NOT_MET_EXCEPTION",
            {
                reason,
                originalError,
            },
        )
    }
}

