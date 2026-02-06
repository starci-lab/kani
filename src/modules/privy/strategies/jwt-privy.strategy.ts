import {
    Injectable 
} from "@nestjs/common"
import {
    PassportStrategy 
} from "@nestjs/passport"
import {
    Strategy 
} from "passport-custom"
import { 
    InvalidAuthenticationTokenException, 
    NoAuthenticationTokenException, 
} from "@modules/exceptions"
import {
    Request 
} from "express"
import {
    ExtractJwt 
} from "passport-jwt"
import {
    PrivyClient 
} from "@privy-io/node"
import {
    InjectPrivyClient 
} from "../privy.decorators"
import {
    JwtAccessTokenPayload 
} from "@modules/passport"

/**
 * The name of the JWT Privy strategy.
 */
export const JWT_PRIVY_STRATEGY = "jwt-privy"

/**
 * The JWT Privy strategy for authenticating requests.
 */
@Injectable()
export class JwtPrivyStrategy extends PassportStrategy(
    Strategy, 
    JWT_PRIVY_STRATEGY
) {
    constructor(
        @InjectPrivyClient()
        private readonly privyClient: PrivyClient
    ) {
        super()
    }

    /**
     * Authenticate a request.
     * @param req - The request to authenticate.
     * @returns The authenticated request.
     */
    async authenticate(req: Request) {
        const extractor = ExtractJwt.fromAuthHeaderAsBearerToken()
        const token = extractor(req)
        if (!token) return this.fail(new NoAuthenticationTokenException({
        }),
        401)
        try {
            const payload = await this.privyClient.utils().auth().verifyAccessToken(token)
            if (!payload) return this.fail(new InvalidAuthenticationTokenException({
                token,
            }),
            401)
            return this.success(payload)
        } catch {
            return this.fail(new InvalidAuthenticationTokenException({
                token,
            }),
            401)
        }
    }

    validate(payload: JwtAccessTokenPayload) {
        return payload
    }
}