import { AbstractException } from "../abstract"

export class UserIdRequiredToGenerateAccessTokenException extends AbstractException {
    constructor(message?: string) {
        super(message || "User ID is required to generate access token", "USER_ID_REQUIRED_TO_GENERATE_ACCESS_TOKEN_EXCEPTION")
    }
}