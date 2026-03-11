import type {
    PositionSettlementSchema 
} from "@modules/databases"

/** Cached position settlements for a bot (used when requeueing close-position job). */
export type ClosePositionSettlementsCacheResult = Array<Partial<PositionSettlementSchema>>
