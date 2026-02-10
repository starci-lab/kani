import type BN from "bn.js"

/** Single token input in withdraw cache. */
export interface WithdrawCacheTokenInput {
    tokenId: string
    amount: BN
}

/** Withdraw cache result. */
export interface WithdrawCacheResult {
    tokenInputs: Array<WithdrawCacheTokenInput>
    toUsdc?: boolean
}
