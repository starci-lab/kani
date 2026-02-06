import {
    BotSchema
} from "@modules/databases"

/**
 * Parameters for evaluating balance snapshots eligibility.
 */
export interface EvalSnapshotParams {
    bot: BotSchema
}

/**
 * Result of balance snapshots evaluation.
 */
export interface EvalSnapshotResult {
    eligible: boolean
}
