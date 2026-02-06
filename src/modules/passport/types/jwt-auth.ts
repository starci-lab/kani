import type {
    EncryptedPayload
} from "@modules/crypto"

/** Params for generating access/refresh tokens. */
export interface GenerateParams {
    id: string
    mfaEnabled: boolean
    encryptedTotpSecretPayload?: EncryptedPayload
}

