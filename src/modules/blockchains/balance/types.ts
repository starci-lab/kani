import {
    BotSchema, 
    TokenSchema
} from "@modules/databases"
import BN from "bn.js"
import {
    SolanaTx 
} from "../interfaces"
import {
    SignatureWithBytes 
} from "@mysten/sui/cryptography"

export interface BalanceOptions {
    enable?: {
        fetcher?: boolean
        action?: boolean
        enqueue?: boolean
    }
}

export interface WithdrawTokenInput {
    token: TokenSchema
    amount: BN
}

export interface PrepareTx {
    txHash: string
    solanaTx?: SolanaTx
    signatureWithBytes?: SignatureWithBytes
}

export interface PrepareWithdrawTransactionParams {
    bot: BotSchema
    tokenInputs: Array<WithdrawTokenInput>
    toAddress: string
    toUsdc?: boolean
}

export interface PrepareWithdrawTransactionResult {
    prepareTxs: Array<PrepareTx>
}

export interface ExecuteWithdrawTransactionParams {
    bot: BotSchema
    prepareTxs: Array<PrepareTx>
    isRetry?: boolean
    stimulate?: boolean
}

export interface ExecuteWithdrawTransactionResult {
    txHashes: Array<string>
}

export interface ExecuteReconcileBalanceTransactionParams {
    bot: BotSchema
    prepareTxs: Array<PrepareTx>
    isRetry?: boolean
    stimulate?: boolean
}

export interface ExecuteReconcileBalanceTransactionResults {
    txHashes: Array<string>
}

export interface ReconcileBalanceTokenInput {
    tokenIn: TokenSchema
    tokenOut: TokenSchema
    amount: BN
}

export interface PrepareReconcileBalanceTransactionParams {
    bot: BotSchema
    tokenInputs: Array<ReconcileBalanceTokenInput>
}

export interface PrepareReconcileBalanceTransactionResult {
    prepareTxs: Array<PrepareTx>
}