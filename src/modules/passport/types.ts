export interface UserLike {
    email: string
    username: string
    picture: string
    id?: string
    sessionId?: string
    referralCode?: string
}

export interface UserGoogleLike extends UserLike {
    oauthProviderId: string
    destinationUrl?: string
}

export type UserJwtLike = UserLike

export interface AuthCredentials {
    accessToken: string
    refreshToken: string
}

export interface JwtPayload {
    id: string
    sessionId: string
}