/**
 * Bot Exceptions
 * Errors related to bot operations, positions, and transactions
 */

import { AbstractException } from "../abstract"

/** Thrown when bot cannot be found by ID */
export class BotNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Bot not found", "BOT_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when snapshot balances have not been set */
export class SnapshotBalancesNotSetException extends AbstractException {
    constructor(message?: string) {
        super(message || "Snapshot balances not set", "SNAPSHOT_BALANCES_NOT_SET_EXCEPTION")
    }
}

/** Thrown when attempting to backup an already backed up private key */
export class BotAlreadyBackupedPrivateKeyException extends AbstractException {
    constructor(message?: string) {
        super(message || "Bot already backuped private key", "BOT_ALREADY_BACKUPED_PRIVATE_KEY_EXCEPTION")
    }
}

/** Thrown when user tries to access a bot they don't own */
export class BotNotOwnedByUserException extends AbstractException {
    constructor(message?: string) {
        super(message || "Bot not owned by user", "BOT_NOT_OWNED_BY_USER_EXCEPTION")
    }
}

/** Thrown when snapshot target token balance amount is not set */
export class SnapshotTargetTokenBalanceAmountNotSetException extends AbstractException {
    constructor(message?: string) {
        super(message || "Snapshot target token balance amount not set", "SNAPSHOT_TARGET_TOKEN_BALANCE_AMOUNT_NOT_SET_EXCEPTION")
    }
}

/** Thrown when target balance is insufficient for operation */
export class InsufficientTargetBalanceAmountException extends AbstractException {
    constructor(message?: string) {
        super(message || "Insufficient target balance amount", "INSUFFICIENT_TARGET_BALANCE_AMOUNT_EXCEPTION")
    }
}

/** Thrown when quote balance is insufficient for operation */
export class InsufficientQuoteBalanceAmountException extends AbstractException {
    constructor(message?: string) {
        super(message || "Insufficient quote balance amount", "INSUFFICIENT_QUOTE_BALANCE_AMOUNT_EXCEPTION")
    }
}

/** Thrown when active position cannot be found for bot */
export class ActivePositionNotFoundException extends AbstractException {
    constructor(botId: string, message?: string) {
        super(message || "Active position not found", "ACTIVE_POSITION_NOT_FOUND_EXCEPTION", { botId })
    }
}

/** Thrown when active position liquidity is not set */
export class ActivePositionLiquidityNotSetException extends AbstractException {
    constructor(botId: string, message?: string) {
        super(message || "Active position liquidity not set", "ACTIVE_POSITION_LIQUIDITY_NOT_SET_EXCEPTION", { botId })
    }
}

/** Thrown when owner position cannot be found in pool */
export class OwnerPositionNotFoundException extends AbstractException {
    constructor(botId: string, poolAddress: string, programId: string, message?: string) {
        super(message || "Owner position not found", "OWNER_POSITION_NOT_FOUND_EXCEPTION", { botId, poolAddress, programId })
    }
}

/** Thrown when snapshot balances before open position are not set */
export class SnapshotBalancesBeforeOpenNotSetException extends AbstractException {
    constructor(message?: string) {
        super(message || "Snapshot balances before open not set", "SNAPSHOT_BALANCES_BEFORE_OPEN_NOT_SET_EXCEPTION")
    }
}

/** Thrown when no more bots are available for pagination */
export class NoMoreBotsFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "No more bots found", "NO_MORE_BOTS_FOUND_EXCEPTION")
    }
}

/** Thrown when no more positions are available for pagination */
export class NoMorePositionsFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "No more positions found", "NO_MORE_POSITIONS_FOUND_EXCEPTION")
    }
}

/** Thrown when required history filters are missing */
export class MissingHistoryFiltersException extends AbstractException {
    constructor(message?: string) {
        super(message || "Missing history filters", "MISSING_HISTORY_FILTERS_EXCEPTION")
    }
}

/** Thrown when time range is not divisible by interval */
export class NotDivisibleByIntervalHistoryFiltersException extends AbstractException {
    constructor(message?: string) {
        super(message || "Not divisible by interval in history filters", "NOT_DIVISIBLE_BY_INTERVAL_HISTORY_FILTERS_EXCEPTION")
    }
}

/** Thrown when history query requests too many intervals */
export class TooManyIntervalsException extends AbstractException {
    constructor(message?: string) {
        super(message || "Too many intervals in history filters", "TOO_MANY_INTERVALS_EXCEPTION")
    }
}

/** Thrown when no more transactions are available for pagination */
export class NoMoreTransactionsFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "No more transactions found", "NO_MORE_TRANSACTIONS_FOUND_EXCEPTION")
    }
}

/** Thrown when bot is already running */
export class BotAlreadyRunningException extends AbstractException {
    constructor(message?: string) {
        super(message || "Bot already running", "BOT_ALREADY_RUNNING_EXCEPTION")
    }
}

/** Thrown when bot is already stopped */
export class BotAlreadyStoppedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Bot already stopped", "BOT_ALREADY_STOPPED_EXCEPTION")
    }
}