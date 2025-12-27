import { AbstractException } from "../abstract"

export class TransactionMessageTooLargeException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction message is too large", "TRANSACTION_MESSAGE_TOO_LARGE_EXCEPTION")
    }
}

export class CreateAtaInstructionException extends AbstractException {
    constructor(message?: string) {
        super(message || "Create Ata Instruction is not found", "CREATE_ATA_INSTRUCTION_EXCEPTION")
    }
}

export class TransactionExecutionFailedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction execution failed", "TRANSACTION_EXECUTION_FAILED_EXCEPTION")
    }
}

export class TransactionNotPreparedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction not prepared", "TRANSACTION_NOT_PREPARED_EXCEPTION")
    }
}

export class TransactionNotExecutedException extends AbstractException {
    constructor(message?: string) {
        super(message || "Transaction not executed", "TRANSACTION_NOT_EXECUTED_EXCEPTION")
    }
}

export class MintKeyPairNotSetException extends AbstractException {
    constructor(message?: string) {
        super(message || "Mint key pair not set", "MINT_KEY_PAIR_NOT_SET_EXCEPTION")
    }
}

export class LiquidityNotSetException extends AbstractException {
    constructor(message?: string) {
        super(message || "Liquidity not set", "LIQUIDITY_NOT_SET_EXCEPTION")
    }
}

export class AtaAddressNotSetException extends AbstractException {
    constructor(message?: string) {
        super(message || "Ata address not set", "ATA_ADDRESS_NOT_SET_EXCEPTION")
    }
}

export class PositionIdNotSetException extends AbstractException {
    constructor(message?: string) {
        super(message || "Position id not set", "POSITION_ID_NOT_SET_EXCEPTION")
    }
}

export class PositionNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Position not found", "POSITION_NOT_FOUND_EXCEPTION")
    }
}