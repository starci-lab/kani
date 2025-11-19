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