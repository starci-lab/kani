import type {
    ClientSession 
} from "mongoose"
import type {
    BotSchema,
    TransactionType
} from "@modules/databases"
import {
    ChainId 
} from "../../enums"

/** Params for adding a transaction record to snapshot history. */
export interface AddTransactionRecordParams {
    bot: BotSchema
    session?: ClientSession
    txHash: string
    chainId: ChainId
    type: TransactionType
}

/** Result of adding a transaction record (no payload). */
export type AddTransactionRecordResult = void
