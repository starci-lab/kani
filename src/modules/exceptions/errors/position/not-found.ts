import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Thrown when clmm state is not found for position */
export interface PositionClmmStateNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    positionId: string
    botId: string
}

export class PositionClmmStateNotFoundException extends AbstractException {
    constructor(
        { positionId, botId, originalError }: PositionClmmStateNotFoundExceptionMetadata
    ) {
        super("Clmm state not found",
            "CLMM_STATE_NOT_FOUND_EXCEPTION",
            {
                positionId,
                botId,
                originalError,
            }
        )
    }
}

/** Thrown when dlmm state is not found for position */
export interface PositionDlmmStateNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    positionId: string
    botId: string
}

export class PositionDlmmStateNotFoundException extends AbstractException {
    constructor(
        { positionId, botId, originalError }: PositionDlmmStateNotFoundExceptionMetadata
    ) {
        super("Dlmm state not found",
            "DLMM_STATE_NOT_FOUND_EXCEPTION",
            {
                positionId,
                botId,
                originalError,
            }
        )
    }
}

/** Thrown when position is not found */
export interface PositionNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    positionId: string
}

export class PositionNotFoundException extends AbstractException {
    constructor(
        { positionId, originalError }: PositionNotFoundExceptionMetadata
    ) {
        super("Position not found",
            "POSITION_NOT_FOUND_EXCEPTION",
            {
                positionId,
                originalError,
            }
        )
    }
}

/** Thrown when position ID is missing (e.g. bot has no active position). */
export interface PositionIdNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}

export class PositionIdNotFoundException extends AbstractException {
    constructor(
        { botId, originalError }: PositionIdNotFoundExceptionMetadata
    ) {
        super(
            "Position ID not found",
            "POSITION_ID_NOT_FOUND_EXCEPTION",
            {
                botId,
                originalError,
            }
        )
    }
}