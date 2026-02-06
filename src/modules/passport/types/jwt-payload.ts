/** Access token JWT payload. */
export interface JwtAccessTokenPayload {
    id: string
    totpVerified: boolean
}

/** Refresh token JWT payload. */
export interface JwtRefreshTokenPayload {
    sessionId: string
    id: string
}
