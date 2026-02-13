import type {
    TransactionType
} from "@modules/exceptions"
import type {
    BotSchema,
    LiquidityPoolSchema
} from "@modules/databases"
import type {
    SignedTx
} from "../../../types"
import type {
    SuiEventFromTransaction
} from "./execute"

/** Params for stimulating a Sui transaction (devInspect). Throws TransactionSubmitFailedException on failure. */
export interface StimulateSuiTransactionParams {
    /** Signed transaction */
    signedTx: SignedTx
    /** Bot */
    bot: BotSchema
    /** Transaction type */
    transactionType: TransactionType
    /** Liquidity pool */
    liquidityPool?: LiquidityPoolSchema
}

/** Result of stimulating a Sui transaction (devInspect). */
export interface StimulateSuiTransactionResult {
    txHash: string
    events: Array<SuiEventFromTransaction>
}