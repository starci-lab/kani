import type {
    DexId,
    LiquidityPoolSchema
} from "@modules/databases"
import type {
    AccountKind
} from "../../enums"

/** Params for fetching a Solana account by address. Throws if account not found. */
export interface FetchSolanaAccountParams {
    /** Account address to fetch */
    address: string
    /** Account kind for exception context */
    kind: AccountKind
    /** DEX ID for exception context */
    dexId: DexId
    /** Liquidity pool for exception context */
    liquidityPool: LiquidityPoolSchema
}

/** Params for fetching a Solana transaction by hash. */
export interface FetchSolanaTransactionParams {
    /** Transaction hash to fetch */
    txHash: string
}
