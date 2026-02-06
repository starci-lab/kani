import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Thrown when active position cannot be found for bot */
export interface ActivePositionNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}

/** Thrown when active position cannot be found. */
export class ActivePositionNotFoundException extends AbstractException {
    constructor(
        { botId, originalError }: ActivePositionNotFoundExceptionMetadata,
    ) {
        super("Active position not found",
            "ACTIVE_POSITION_NOT_FOUND_EXCEPTION",
            {
                botId,
                originalError,
            },
        )
    }
}

/** Thrown when associated position is not set */
export interface AssociatedPositionNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}

/** Thrown when associated position cannot be found. */
export class AssociatedPositionNotFoundException extends AbstractException {
    constructor(
        { botId, originalError }: AssociatedPositionNotFoundExceptionMetadata,
    ) {
        super("Associated position not found",
            "ASSOCIATED_POSITION_NOT_FOUND_EXCEPTION",
            {
                botId,
                originalError,
            },
        )
    }
}

