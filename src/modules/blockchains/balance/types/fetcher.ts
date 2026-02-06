import {
    BotSchema, 
    TokenSchema
} from "@modules/databases"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    TokenBalance
} from "./balance"

/** Parameters for fetching a single balance. */
export interface FetchBalanceParams {
    bot: BotSchema
    token: TokenSchema
}

/** Result of fetching a single balance. */
export interface FetchBalanceResult {
    balanceAmount: BN
}

/** Parameters for fetching multiple balances. */
export interface FetchBalancesParams {
    bot: BotSchema
    incentiveTokens?: Array<TokenSchema>
}

/** Result of fetching multiple balances. */
export interface FetchBalancesResult {
    targetBalanceAmount: BN
    quoteBalanceAmount: BN
    gasBalanceAmount: BN
    incentiveBalanceAmounts: Record<string, BN>
}

/** Parameters for fetching tokens. */
export interface FetchTokensParams {
    bot: BotSchema
}

/** Result of fetching tokens. */
export interface FetchTokensResult {
    tokens: Array<TokenBalance>
}
