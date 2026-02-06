import type {
    Dayjs
} from "dayjs"

/** Params for aligning a time to an interval in UTC. */
export interface AlignTimeToIntervalUtcParams {
    timeZone: string
    intervalMs: number
    time: Dayjs
}
