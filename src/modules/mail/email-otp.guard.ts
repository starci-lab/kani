import { 
    CanActivate, 
    ExecutionContext, 
    Injectable, 
    UnauthorizedException
} from "@nestjs/common"
import {
    GqlExecutionContext 
} from "@nestjs/graphql"
import {
    UserJwtLike 
} from "@modules/passport"
import { 
    CacheKey,
    CacheService, 
} from "@modules/cache"

@Injectable()
export class GraphQLEmailOtpGuard implements CanActivate {
    constructor(
        private readonly cacheService: CacheService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = GqlExecutionContext.create(context).getContext().req
        const emailOtp = request.headers["x-email-otp"]
        if (!emailOtp) {
            throw new UnauthorizedException("Email OTP is required")
        }
        const user = request.user as UserJwtLike
        const cachedEmailOtp = await this.cacheService.get(
            {
                key: CacheKey.SendOtpCode,
                args: [user.id],
            }
        )
        if (!cachedEmailOtp) {
            throw new UnauthorizedException("Email OTP not found")
        }
        if (cachedEmailOtp.otp !== emailOtp) {
            throw new UnauthorizedException("Email OTP mismatch")
        }
        // delete the email OTP from cache
        await this.cacheService.del(
            {
                key: CacheKey.SendOtpCode,
                args: [user.id],
            }
        )
        return true
    }
}