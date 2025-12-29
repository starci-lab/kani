/**
 * Transaction Exceptions
 * Errors related to blockchain transaction operations
 */

import { AbstractException } from "../abstract"

/** Thrown when transaction message exceeds size limit */
export class TransactionMessageTooLargeException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction message is too large", "TRANSACTION_MESSAGE_TOO_LARGE_EXCEPTION")
    }
}

/** Thrown when ATA creation instruction is not found */
export class CreateAtaInstructionException extends AbstractException {
    constructor(message?: string) {
        super(message || "Create Ata Instruction is not found", "CREATE_ATA_INSTRUCTION_EXCEPTION")
    }
}

/** Thrown when transaction execution fails */
export class TransactionExecutionFailedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction execution failed", "TRANSACTION_EXECUTION_FAILED_EXCEPTION")
    }
}

/** Thrown when transaction has not been prepared */
export class TransactionNotPreparedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction not prepared", "TRANSACTION_NOT_PREPARED_EXCEPTION")
    }
}

/** Thrown when transaction has not been executed */
export class TransactionNotExecutedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction not executed", "TRANSACTION_NOT_EXECUTED_EXCEPTION")
    }
}

/** Thrown when mint keypair is not set */
export class MintKeyPairNotSetException extends AbstractException {
    constructor(message?: string) {
        super(message || "Mint key pair not set", "MINT_KEY_PAIR_NOT_SET_EXCEPTION")
    }
}

/** Thrown when liquidity is not set */
export class LiquidityNotSetException extends AbstractException {
    constructor(message?: string) {
        super(message || "Liquidity not set", "LIQUIDITY_NOT_SET_EXCEPTION")
    }
}

/** Thrown when ATA address is not set */
export class AtaAddressNotSetException extends AbstractException {
    constructor(message?: string) {
        super(message || "Ata address not set", "ATA_ADDRESS_NOT_SET_EXCEPTION")
    }
}

/** Thrown when position ID is not set */
export class PositionIdNotSetException extends AbstractException {
    constructor(message?: string) {
        super(message || "Position id not set", "POSITION_ID_NOT_SET_EXCEPTION")
    }
}

/** Thrown when position cannot be found */
export class PositionNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Position not found", "POSITION_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when position has invalid type (not a move object) */
export class PositionInvalidTypeException extends AbstractException {
    constructor(message?: string) {
        super(message || "Position is not a move object", "POSITION_INVALID_TYPE_EXCEPTION")
    }
}
