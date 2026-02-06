import {
    EncryptedPayload
} from "@modules/crypto"
import {
    PlatformId
} from "@modules/common"

/**
 * Generated keypair with account address and encrypted private key.
 */
export interface GeneratedKeypair {
    /** The public account address of the generated keypair. */
    accountAddress: string
    /** The encrypted private key payload. */
    encryptedPrivateKeyPayload: EncryptedPayload
}

/**
 * Parameters for generating a new keypair.
 */
export interface GenerateKeypairParams {
    /** The platform for which to generate the keypair (EVM, Sui, Solana). */
    platformId: PlatformId
}

/**
 * Result of generating a new keypair.
 */
export type GenerateKeypairResult = GeneratedKeypair

/**
 * Parameters for retrieving a private key.
 */
export interface GetPrivateKeyParams {
    /** The encrypted private key payload. */
    encryptedPrivateKeyPayload: EncryptedPayload
}

/**
 * Result of retrieving a private key.
 */
export type GetPrivateKeyResult = string
