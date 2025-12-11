import { Injectable } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { Strategy } from "passport-custom"
import { Request } from "express"
import { ExtractJwt } from "passport-jwt"
import { InjectPrivy } from "@modules/privy"
import { PrivyClient, VerifyAuthTokenResponse } from "@privy-io/node"
import { 
    InvalidPrivyAuthTokenException, 
    NoPrivyAuthTokenProvidedException 
} from "@exceptions"

export const PRIVY_AUTH_TOKEN_STRATEGY = "privy-auth-token"
@Injectable()
export class PrivyAuthTokenStrategy extends PassportStrategy(
    Strategy, 
    PRIVY_AUTH_TOKEN_STRATEGY
) {
    constructor(
        @InjectPrivy()
        private readonly privyClient: PrivyClient,
    ) {
        super()
    }
    // authenticate the Privy auth token
    async authenticate(req: Request): Promise<void> {
        const authToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req)
        if (!authToken) {
            throw new NoPrivyAuthTokenProvidedException("No Privy auth token provided")
        }
        try {
            const response = await this.privyClient.utils().auth().verifyAuthToken(authToken)
            return this.success(response)
        } catch {
            throw new InvalidPrivyAuthTokenException("Invalid Privy auth token")
        }
    }

    // validate the Privy auth token
    validate(payload: VerifyAuthTokenResponse) {
        return payload
    }
}