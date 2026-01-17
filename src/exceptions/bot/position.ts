import { LiquidityPoolId } from "@modules/databases"
import { AbstractException } from "../abstract"

/** Thrown when active position cannot be found for bot */
export interface ActivePositionNotFoundExceptionMetadata {
    botId: string
}

export class ActivePositionNotFoundException extends AbstractException {
    constructor(
        { botId }: ActivePositionNotFoundExceptionMetadata
    ) {
        super("ACTIVE_POSITION_NOT_FOUND_EXCEPTION", "ACTIVE_POSITION_NOT_FOUND_EXCEPTION", {
            botId,
        })
    }
}

/** Thrown when position id is not set */
export interface PositionIdNotSetExceptionMetadata {
    botId: string
    positionId: string
    liquidityPoolId: LiquidityPoolId
}

export class PositionIdNotSetException extends AbstractException {
    constructor(
        { botId, positionId, liquidityPoolId }: PositionIdNotSetExceptionMetadata
    ) {
        super("POSITION_ID_NOT_SET_EXCEPTION", "POSITION_ID_NOT_SET_EXCEPTION", {
            botId,
            positionId,
            liquidityPoolId,
        })
    }
}