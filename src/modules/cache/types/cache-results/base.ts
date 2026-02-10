import type {
    Dayjs,
} from "dayjs"

/** Base cache result with snapshot timestamp. */
export interface SnapshotCacheResult {
    snapshotAt: Dayjs
}
