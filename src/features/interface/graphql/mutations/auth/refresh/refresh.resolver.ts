import {
    Context, Mutation, Resolver 
} from "@nestjs/graphql"
import {
    RefreshService 
} from "./refresh.service"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import { 
    GraphQLUser, 
    GraphQLJwtRefreshTokenAuthGuard, 
    UserJwtLike,
} from "@modules/passport"
import { 
    RefreshResponse, 
    RefreshResponseData,
} from "./graphql-types"
import {
    ThrottlerConfig 
} from "@modules/throttler"
import {
    UseThrottler 
} from "@modules/throttler/throttler.decorators"
import {
    GraphQLSuccessMessage, GraphQLTransformInterceptor 
} from "@modules/api"
import {
    CookieService 
} from "@modules/cookie"
import {
    Response 
} from "express"
import {
    GraphQLTOTPGuard 
} from "@modules/totp"

@Resolver()
export class RefreshResolver {
    constructor(
        private readonly refreshService: RefreshService,
        private readonly cookieService: CookieService,
    ) {}

    @GraphQLSuccessMessage("JWT access token refreshed successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtRefreshTokenAuthGuard,
        GraphQLTOTPGuard)
    @Mutation(() => RefreshResponse,
        {
            deprecationReason: "This mutation is deprecated. Use the privy authentication instead.",
            description: "Refresh a JWT access token.",
        })
    async refresh(
        @GraphQLUser() user: UserJwtLike,
        @Context("res") res: Response,
    ): Promise<RefreshResponseData> {
        const { accessToken, refreshToken } = await this.refreshService.refresh(user)
        if (!refreshToken) {
            // simple check to ensure type-safety
            throw new Error("Refresh token not found")
        }
        this.cookieService.attachHttpOnlyCookie({
            res,
            name: "refresh_token",
            value: refreshToken,
        })
        return {
            accessToken 
        }
    }
}

