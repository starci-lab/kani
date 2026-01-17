import { AbstractException } from "../abstract"

/** Thrown when snapshot balances have not been set */
export interface SnapshotBalancesNotSetExceptionMetadata {
    botId: string
}
export class SnapshotBalancesNotSetException extends AbstractException {
    constructor(
        { botId }: SnapshotBalancesNotSetExceptionMetadata
    ) {
        super(
            "SNAPSHOT_BALANCES_NOT_SET_EXCEPTION", 
            "SNAPSHOT_BALANCES_NOT_SET_EXCEPTION", 
            { botId }
        )
    }
}