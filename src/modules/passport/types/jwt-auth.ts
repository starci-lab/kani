import type {
    EncryptedPayload
} from "@modules/typedefs"

/** Params for generating access/refresh tokens. */
export interface GenerateParams {
    id: string
    mfaEnabled: boolean
    encryptedTotpSecretPayload?: EncryptedPayload
}

