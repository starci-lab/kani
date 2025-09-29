export interface UserGoogleLike {
    email: string
    username: string
    picture: string
    totpVerified: boolean
    referralCode?: string
    oauthProviderId: string
    destinationUrl?: string
}

export interface UserJwtLike {
    id: string
    totpVerified: boolean
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