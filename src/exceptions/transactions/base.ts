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