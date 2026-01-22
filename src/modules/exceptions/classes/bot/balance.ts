import {
    AbstractException, AbstractExceptionMetadata
} from "../abstract"
import {
    ChainId
} from "@modules/typedefs"

/** Thrown when the gas balance amount is insufficient */
export interface InsufficientMinGasBalanceAmountExceptionMetadata extends AbstractExceptionMetadata {
    gasBalanceAmount: string
    minOperationalGasAmount: string
    chainId: ChainId
    botId: string
}
export class InsufficientMinGasBalanceAmountException extends AbstractException {
    constructor(
        { 
            gasBalanceAmount, 
            minOperationalGasAmount, 
            chainId, 
            botId,
            originalError 
        }: InsufficientMinGasBalanceAmountExceptionMetadata
    ) {
        super(
            "Insufficient minimum gas balance amount",
            "INSUFFICIENT_MIN_GAS_BALANCE_AMOUNT_EXCEPTION",
            {
                gasBalanceAmount,
                minOperationalGasAmount,
                chainId,
                botId,
                originalError,
            }
        )
    }  
}