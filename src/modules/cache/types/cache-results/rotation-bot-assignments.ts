import {
    SnapshotCacheResult 
} from "./base"

/** Rotation bot assignments cache result. */
export interface RotationBotAssignment {
    botId: string
    liquidityPoolIds: Array<string>
}

/** Rotation bot assignments cache result. */
export interface RotationBotAssignmentsCacheResult extends SnapshotCacheResult {
    results: Array<RotationBotAssignment>
}