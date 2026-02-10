import type {
    RotationBotAssignment 
} from "@modules/cache"

/** Rotation bot assignments message. */
export interface RotationBotAssignmentsMessage {
    results: Record<string, Omit<RotationBotAssignment, "botId">>
}