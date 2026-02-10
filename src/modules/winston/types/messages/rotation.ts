import type {
    RotationBotAssignment 
} from "@modules/cache"

/** Rotation bot assignments message. */
export interface RotationBotAssignmentsMessage {
    results: Map<string, Omit<RotationBotAssignment, "botId">>
}