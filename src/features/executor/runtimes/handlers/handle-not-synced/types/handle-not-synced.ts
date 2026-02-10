import {
    Dayjs 
} from "dayjs"

/** State for liquidity pool cache request tracking. */
export interface HandleNotSyncedState {
    snapshotAt: Dayjs
}
