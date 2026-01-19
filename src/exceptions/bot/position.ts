import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when active position cannot be found for bot */
export interface ActivePositionNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}

export class ActivePositionNotFoundException extends AbstractException {
    constructor(
        { botId, originalError }: ActivePositionNotFoundExceptionMetadata
    ) {
        super("Active position not found",
            "ACTIVE_POSITION_NOT_FOUND_EXCEPTION",
            {
                botId,
                originalError,
            }
        )
    }
}

/** Thrown when position id is not set */
export interface PositionIdNotSetExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    liquidityPoolId: string
}

export class PositionIdNotSetException extends AbstractException {
    constructor(
        { botId, liquidityPoolId, originalError }: PositionIdNotSetExceptionMetadata
    ) {
        super("Position ID is not set",
            "POSITION_ID_NOT_SET_EXCEPTION",
            {
                botId,
                liquidityPoolId,
                originalError,
            }
        )
    }
}

/** Thrown when associated position is not set */
export interface AssociatedPositionNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}
export class AssociatedPositionNotFoundException extends AbstractException {
    constructor(
        { botId, originalError }: AssociatedPositionNotFoundExceptionMetadata
    ) {
        super("Associated position not found",
            "ASSOCIATED_POSITION_NOT_FOUND_EXCEPTION",
            {
                botId, originalError,
            }
        )
    }
}