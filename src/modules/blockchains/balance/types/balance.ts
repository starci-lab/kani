import {
    BotSchema, 
    TokenSchema
} from "@modules/databases"
import BN from "bn.js"
import Decimal from "decimal.js"
import {
    PrepareTx,
    SolanaTx 
} from "../../interfaces"
import {
    SignatureWithBytes 
} from "@mysten/sui/cryptography"
import {
    ComputeQuoteRatioResult,
    SwapStep
} from "../../math"
import {
    WithdrawCacheResult 
} from "@modules/cache"

/** Options for balance operations. */
export interface BalanceOptions {
    enable?: {
        fetcher?: boolean
        action?: boolean
        enqueue?: boolean
    }
}

/** Token input for balance withdraw operations. */
export interface BalanceWithdrawTokenInput {
    token: TokenSchema
    amount: BN
}

/** Token input for balance reconcile operations. */
export interface BalanceReconcileBalanceTokenInput {
    tokenIn: TokenSchema
    tokenOut: TokenSchema
    amount: BN
}

/** Token balance information. */
export interface TokenBalance {
    token: TokenSchema
    balanceAmount: BN
    balanceAmountDecimal: Decimal
}
