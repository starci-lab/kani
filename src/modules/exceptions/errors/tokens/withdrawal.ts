import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
/** Thrown when token balance is not enough for withdrawal */
export interface TokenBalanceNotEnoughForWithdrawExceptionMetadata extends AbstractExceptionMetadata {
    id: string
    amount: string
    balance: string
}
export class TokenBalanceNotEnoughForWithdrawException extends AbstractException {
    constructor(
        { id, amount, balance, originalError }: TokenBalanceNotEnoughForWithdrawExceptionMetadata
    ) {
        super(
            "Token balance is not enough for withdrawal",
            "TOKEN_BALANCE_NOT_ENOUGH_FOR_WITHDRAW_EXCEPTION",
            {
                id,
                amount,
                balance,
                originalError,
            }
        )
    }
}