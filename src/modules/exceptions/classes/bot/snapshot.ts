import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when snapshot balances have not been set */
export interface SnapshotBalancesNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}
export class SnapshotBalancesNotFoundException extends AbstractException {
    constructor(
        { botId, originalError }: SnapshotBalancesNotFoundExceptionMetadata
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