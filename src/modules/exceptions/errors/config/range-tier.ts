import type {
    AbstractExceptionMetadata,
} from "../abstract"
import {
    AbstractException,
} from "../abstract"

/** Metadata when range tier is not configured in app config. */
export interface RangeTierNotConfiguredExceptionMetadata extends AbstractExceptionMetadata {
    /** The bot range tier that has no config entry. */
    rangeTier?: string
}

/** Thrown when the bot's range tier is not found in appConfig.rangeTiers. */
export class RangeTierNotConfiguredException extends AbstractException {
    constructor(
        { rangeTier, originalError }: RangeTierNotConfiguredExceptionMetadata,
    ) {
        super(
            "Range tier not configured",
            "RANGE_TIER_NOT_CONFIGURED_EXCEPTION",
            {
                rangeTier,
                originalError,
            },
        )
    }
}
