/**
 * but before OTP (2FA) verification is completed.
 *
 * accessToken is a short-lived token that identifies the user
 * during the OTP verification step. Once the OTP is verified,
 * the server will return a real accessToken.
 */
export class GoogleCallbackV1Response {
    accessToken: string
    destinationUrl?: string
}