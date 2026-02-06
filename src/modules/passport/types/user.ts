import type {
    EncryptedPayload
} from "@modules/crypto"

/** User shape from Google OAuth. */
export interface UserGoogleLike {
    email: string
    username: string
    picture: string
    mfaEnabled: boolean
    referralCode?: string
    oauthProviderId: string
    destinationUrl?: string
}

/** User shape in JWT. */
export interface UserJwtLike {
    id: string
    mfaEnabled: boolean
    encryptedTotpSecretPayload?: EncryptedPayload
}
