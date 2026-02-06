import {
    EncryptedPayload 
} from "@modules/typedefs"

export interface UserGoogleLike {
    email: string
    username: string
    picture: string
    mfaEnabled: boolean
    referralCode?: string
    oauthProviderId: string
    destinationUrl?: string
}

export interface UserJwtLike {
    id: string
    mfaEnabled: boolean
    encryptedTotpSecretPayload?: EncryptedPayload
}

export interface AuthCredentials {
    accessToken: string
    refreshToken?: string
}

export interface JwtAccessTokenPayload {
    id: string
    totpVerified: boolean
}

export interface JwtRefreshTokenPayload {
    sessionId: string
    id: string
}