import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when snapshot balances have not been set */
export interface BalanceSnapshotsNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}
export class BalanceSnapshotsNotFoundException extends AbstractException {
    constructor(
        { botId, originalError }: BalanceSnapshotsNotFoundExceptionMetadata
    ) {
        super(
            "Snapshot balances have not been found", 
            "SNAPSHOT_BALANCES_NOT_FOUND_EXCEPTION", 
            {
                botId, originalError 
            }
        )
    }
}