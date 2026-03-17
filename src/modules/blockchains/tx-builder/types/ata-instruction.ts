import type {
    Address, Instruction 
} from "@solana/kit"
import type BN from "bn.js"

/** Params for getting or creating an associated token account (ATA) instructions. */
export interface GetOrCreateAtaInstructionsParams {
    tokenMint?: Address
    ownerAddress: Address
    is2022Token?: boolean
    amount?: BN
    pdaOnly?: boolean
}

/** Result of get-or-create ATA: address and optional create/end instructions. */
export interface GetOrCreateAtaInstructionsResult {
    ataAddress: Address
    instructions?: Array<Instruction>
    endInstructions?: Array<Instruction>
}

/** Params for creating a wrapped SOL (WSOL) account and instructions. */
export interface CreateWSolAccountInstructionsParams {
    ownerAddress: Address
    is2022Token?: boolean
    amount: BN
    pdaOnly?: boolean
}

/** Result of create WSOL account: instructions, end instructions, and ATA address. */
export interface CreateWSolAccountInstructionsResult {
    instructions: Array<Instruction>
    endInstructions: Array<Instruction>
    ataAddress: Address
}

/** Params for generating a program-derived address (keypair) with optional seed. */
export interface GeneratePubKeyParams {
    fromAddress: Address
    programAddress: Address
    assignSeed?: string
}

/** Result of generate pubkey: address and seed used. */
export interface GeneratePubKeyResult {
    publicKey: Address
    seed: string
}

/** Params for creating idempotent ATA instructions. */
export interface CreateIdempotentAtaInstructionsParams {
    tokenMint?: Address
    ownerAddress: Address
    is2022Token?: boolean
    amount?: BN
}

/** Result of create idempotent ATA instructions: instructions and ATA address. */
export interface CreateIdempotentAtaInstructionsResult {
    instructions: Array<Instruction>
    ataAddress: Address
}