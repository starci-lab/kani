import type {
    PrepareTx
} from "@modules/blockchains"
import type {
    LiquidityPoolId
} from "@modules/databases"
import type {
    TransactionType
} from "@modules/exceptions"
import type {
    SuiEvent
} from "@mysten/sui/client"

/** Minimal bot shape for execute (exception context). */
export interface ExecuteSuiBot {
    id: string
}

/** Params for executing a Sui transaction on-chain. */
export interface ExecuteSuiTransactionParams {
    prepareTx: PrepareTx
    bot: ExecuteSuiBot
    transactionType: TransactionType
    liquidityPoolId?: LiquidityPoolId
}

/** Sui event from executeTransactionBlock (when showEvents: true). */
export type SuiEventFromTransaction = SuiEvent

/** Result of executing a Sui transaction. */
export interface ExecuteSuiTransactionResult {
    txHash: string
    events: Array<SuiEventFromTransaction>
}
