import { 
    CanActivate, 
    ExecutionContext, 
    Injectable, 
    UnauthorizedException
} from "@nestjs/common"
import { GqlExecutionContext } from "@nestjs/graphql"
import { UserJwtLike } from "@modules/passport"
import { 
    CacheKey,
    createCacheKey, 
    InjectRedisCache, 
    SendOtpCacheResult 
} from "@modules/cache"
import { Cache } from "cache-manager"
import SuperJSON from "superjson"
import { InjectSuperJson } from "@modules/mixin"

@Injectable()
export class GraphQLEmailOtpGuard implements CanActivate {
    constructor(
        @InjectRedisCache()
        private readonly cache: Cache,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = GqlExecutionContext.create(context).getContext().req
        const emailOtp = request.headers["x-email-otp"]
        if (!emailOtp) {
            throw new UnauthorizedException("Email OTP is required")
        }
        const user = request.user as UserJwtLike
        const cachedEmailOtp = await this.cache.get<string>(
            createCacheKey(CacheKey.SendOtpCode, user.id)
        )
        if (!cachedEmailOtp) {
            throw new UnauthorizedException("Email OTP not found")
        }
        const cachedEmailOtpObject = this.superJson.parse<SendOtpCacheResult>(cachedEmailOtp)
        if (cachedEmailOtpObject.otp !== emailOtp) {
            throw new UnauthorizedException("Email OTP mismatch")
        }
        // delete the email OTP from cache
        await this.cache.del(createCacheKey(CacheKey.SendOtpCode, user.id))
        return true
    }
}