import type {
    DexId,
    LiquidityPoolId
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
    /** Liquidity pool ID for exception context */
    liquidityPoolId: LiquidityPoolId
}