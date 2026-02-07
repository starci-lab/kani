import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    LiquidityPoolId 
} from "@modules/databases"
import type {
    TransactionType 
} from "../../enums"

/** Thrown when transaction is not found in params */
export interface MissingSolanaTxParamExceptionMetadata
  extends AbstractExceptionMetadata {
  type: TransactionType
  botId: string
}

/** Thrown when Solana transaction parameter is missing. */
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
  type: TransactionType
  botId: string
}

/** Thrown when Sui transaction message with bytes parameter is missing. */
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
/** Thrown when position ID is not set */
export interface MissingPositionIdParamExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
    liquidityPoolId: LiquidityPoolId
}

/** Thrown when position ID parameter is missing. */
export class MissingPositionIdParamException extends AbstractException {
    constructor({
        botId,
        liquidityPoolId,
        originalError,
    }: MissingPositionIdParamExceptionMetadata) {
        super(
            "Missing position ID parameter",
            "MISSING_POSITION_ID_PARAM_EXCEPTION",
            {
                botId,
                liquidityPoolId,
                originalError,
            },
        )
    }
}

/** Thrown when bot parameters are missing */
export type MissingBotParametersExceptionMetadata = AbstractExceptionMetadata

/** Thrown when bot parameters are missing. */
export class MissingBotParametersException extends AbstractException {
    constructor({
        originalError,
    }: MissingBotParametersExceptionMetadata) {
        super(
            "Missing bot parameters",
            "MISSING_BOT_PARAMETERS_EXCEPTION",
            {
                originalError,
            },
        )
    }
}

/** Thrown when active position liquidity is missing */
export interface MissingActivePositionLiquidityExceptionMetadata extends AbstractExceptionMetadata {
    botId: string
}

/** Thrown when active position liquidity is missing. */
export class MissingActivePositionLiquidityException extends AbstractException {
    constructor({
        botId,
        originalError,
    }: MissingActivePositionLiquidityExceptionMetadata) {
        super("Missing active position liquidity",
            "MISSING_ACTIVE_POSITION_LIQUIDITY_EXCEPTION",
            {
                botId, originalError,
            },
        )
    }
}