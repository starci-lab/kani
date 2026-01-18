import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"
import {
    ErrorTransactionType,
} from "./types"

/** Thrown when transaction is not found in params */
export interface MissingSolanaTxParamExceptionMetadata
  extends AbstractExceptionMetadata {
  type: ErrorTransactionType
  botId: string
}

export class MissingSolanaTxParamException extends AbstractException {
    constructor({
        type,
        botId,
        originalError,
    }: MissingSolanaTxParamExceptionMetadata) {
        super(
            "Missing Solana transaction parameter",
            "MISSING_SOLANA_TX_PARAM",
            {
                type,
                botId,
                originalError,
            },
        )
    }
}

/** Thrown when transaction is not found in params */
export interface MissingSuiMessageWithBytesParamExceptionMetadata
  extends AbstractExceptionMetadata {
  type: ErrorTransactionType
  botId: string
}

export class MissingSuiMessageWithBytesParamException extends AbstractException {
    constructor({
        type,
        botId,
        originalError,
    }: MissingSuiMessageWithBytesParamExceptionMetadata) {    
        super(
            "Missing Sui transaction message with bytes parameter",
            "MISSING_SUI_TRANSACTION_MESSAGE_WITH_BYTES_PARAM",
            {
                type,
                botId,
                originalError,
            },
        )
    }
}