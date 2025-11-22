import { AbstractException } from "../abstract"

export class BotNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Bot not found", "BOT_NOT_FOUND_EXCEPTION")
    }
}

export class SnapshotBalancesNotSetException extends AbstractException {
    constructor(message?: string) {
        super(message || "Snapshot balances not set", "SNAPSHOT_BALANCES_NOT_SET_EXCEPTION")
    }
}

export class SnapshotTargetTokenBalanceAmountNotSetException extends AbstractException {
    constructor(message?: string) {
        super(message || "Snapshot target token balance amount not set", "SNAPSHOT_TARGET_TOKEN_BALANCE_AMOUNT_NOT_SET_EXCEPTION")
    }
}

export class InsufficientTargetBalanceAmountException extends AbstractException {
    constructor(message?: string) {
        super(message || "Insufficient target balance amount", "INSUFFICIENT_TARGET_BALANCE_AMOUNT_EXCEPTION")
    }
}

export class InsufficientQuoteBalanceAmountException extends AbstractException {
    constructor(message?: string) {
        super(message || "Insufficient quote balance amount", "INSUFFICIENT_QUOTE_BALANCE_AMOUNT_EXCEPTION")
    }
}

export class ActivePositionNotFoundException extends AbstractException {
    constructor(botId: string, message?: string) {
        super(message || "Active position not found", "ACTIVE_POSITION_NOT_FOUND_EXCEPTION", { botId })
    }
}

export class OwnerPositionNotFoundException extends AbstractException {
    constructor(
        botId: string, 
        poolAddress: string, 
        programId: string, 
        message?: string
    ) {
        super(message || "Owner position not found", "OWNER_POSITION_NOT_FOUND_EXCEPTION", 
            { 
                botId, 
                poolAddress, 
                programId
            })
    }
}