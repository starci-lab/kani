import type {
    Address, Instruction 
} from "@solana/kit"
import type {
    KeyPairSigner 
} from "@solana/signers"

/** Params for creating a Token-2022 mint account and optional initialize instruction. */
export interface CreateMint2InstructionParams {
    ownerAddress: Address
    url: string
    withInitialize?: boolean
}

/** Result of create mint instruction: instructions and mint keypair. */
export interface CreateMint2InstructionResult {
    instructions: Array<Instruction>
    mintKeyPair: KeyPairSigner
}
