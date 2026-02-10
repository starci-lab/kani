/** Wrapper for event payload (data + instanceId). */
export interface EventPayloadType<T> {
    data: T
    instanceId: string
}

/** Type helper: T with an id field. */
export type WithId<T> = T & {
    id: string
}
