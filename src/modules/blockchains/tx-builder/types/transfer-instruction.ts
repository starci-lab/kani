import type {
    Address, Instruction 
} from "@solana/kit"
import type BN from "bn.js"
import type {
    TokenSchema 
} from "@modules/databases"

/** Params for creating transfer instructions (native or token). */
export interface CreateTransferInstructionsParams {
    fromAddress: Address
    toAddress: Address
    amount: BN
    token: TokenSchema
}

/** Result of create transfer instructions: list of instructions. */
export interface CreateTransferInstructionsResult {
    instructions: Array<Instruction>
}
