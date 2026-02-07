import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"

/** Thrown when a bot has no withdrawal address configured */
export interface BotWithdrawalAddressNotSetExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}

/** Thrown when bot withdrawal address is not set. */
export class BotWithdrawalAddressNotSetException extends AbstractException {
    constructor(
        {
            botId,
            originalError,
        }: BotWithdrawalAddressNotSetExceptionMetadata
    ) {
        super(
            "Bot withdrawal address not set",
            "BOT_WITHDRAWAL_ADDRESS_NOT_SET_EXCEPTION",
            {
                botId,
                originalError,
            },
        )
    }
}

