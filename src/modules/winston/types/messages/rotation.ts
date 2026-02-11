import type {
    LiquidityPoolId
} from "@modules/databases"

/** Rotation bot assignments message. */
export interface RotationBotAssignmentsMessage {
    results: Record<string, Array<LiquidityPoolId>>
}