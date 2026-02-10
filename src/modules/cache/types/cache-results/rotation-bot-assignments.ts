import {
    SnapshotCacheResult 
} from "./base"

/** Rotation bot assignments cache result. */
export interface RotationBotAssignmentsResult {
    botId: string
    liquidityPoolIds: Array<string>
}
export interface RotationBotAssignmentsCacheResult extends SnapshotCacheResult {
    results: Array<RotationBotAssignmentsResult>
}