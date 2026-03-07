import {
    BotSchema,
    TokenSchema 
} from "@modules/databases"
import BN from "bn.js"
import Decimal from "decimal.js"

/** Parameters for converting a balance amount to target token value. */
export interface ConvertSingleAmountToTargetParams {
    /** Raw amount (smallest unit) in the source token. */
    amount: BN
    /** Token the amount is denominated in. */
    fromToken: TokenSchema
    /** Token to express the result in (target). */
    targetToken: TokenSchema
}

/** Parameters for converting a balance amount to target token value. */
export interface ConvertSingleAmountDecimalToTargetParams {
    /** Raw amount (smallest unit) in the source token. */
    amount: Decimal
    /** Token the amount is denominated in. */
    fromToken: TokenSchema
    /** Token to express the result in (target). */
    targetToken: TokenSchema
}

/** Result of converting balance to target. */
export interface ConvertSingleAmountToTargetResult {
    /** Value in target token (human-readable decimal). */
    amountInTarget: Decimal
    /** Value in target token (raw, smallest unit). */
    amountInTargetRaw: BN
}

/** Result of converting balance to target. */
export interface ConvertToTargetResult {
    /** Value in target token (human-readable decimal). */
    totalAmountInTarget: Decimal
    /** Value in target token (raw, smallest unit). */
    totalAmountInTargetRaw: BN
    /** Value in quote token (human-readable decimal). */
    quoteAmountInTarget: Decimal
    /** Value in quote token (raw, smallest unit). */
    quoteAmountInTargetRaw: BN
    /** Value in gas token (human-readable decimal). */
    gasAmountInTarget: Decimal
    /** Value in gas token (raw, smallest unit). */
    gasAmountInTargetRaw: BN
    /** Value in target token (human-readable decimal). */
    targetAmountInTarget: Decimal
    /** Value in target token (raw, smallest unit). */
    targetAmountInTargetRaw: BN
}

/** Parameters for converting a balance amount to target token value. */
export interface ConvertToTargetParams {
    /** Bot to convert the balance of. */
    bot: BotSchema
}

/** Result of converting balance to target. */
export interface ConvertSingleAmountToTargetResult {
    /** Value in target token (human-readable decimal). */
    amountInTarget: Decimal
    /** Value in target token (raw, smallest unit). */
    amountInTargetRaw: BN
}