import {
    BotSchema,
} from "@modules/databases"

export type ExecutorBotUpdatedEventPayload = BotSchema

export interface ExecutorBotCreatedEventPayload {
    id: string
}

export interface ExecutorBotDeletedEventPayload {
    id: string
}
