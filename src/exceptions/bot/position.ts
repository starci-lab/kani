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
