import {
    AbstractException, AbstractExceptionMetadata 
} from "../abstract"

/** Thrown when snapshot balances have not been set */
export interface SnapshotBalancesNotSetExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}
export class SnapshotBalancesNotSetException extends AbstractException {
    constructor(
        { botId, originalError }: SnapshotBalancesNotSetExceptionMetadata
    ) {
        super(
            "Snapshot balances have not been set", 
            "SNAPSHOT_BALANCES_NOT_SET_EXCEPTION", 
            {
                botId, originalError 
            }
        )
    }
}