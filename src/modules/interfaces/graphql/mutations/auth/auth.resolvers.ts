import { Context, Mutation, Resolver } from "@nestjs/graphql"
import { AuthService } from "./auth.service"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import { GraphQLUser, GraphQLJwtRefreshTokenAuthGuard, UserJwtLike, GraphQLJwtAccessTokenAuthGuard } from "@modules/passport"
import { ConfirmTotpResponse, ConfirmTotpResponseData, RefreshResponse, RefreshResponseData } from "./auth.dto"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler/throttler.decorators"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../interceptors"
import { CookieService } from "@modules/cookie"
import { Response } from "express"
import { GraphQLTOTPGuard } from "@modules/totp"


@Resolver()
export class AuthResolvers {
    constructor(
        private readonly authService: AuthService,
        private readonly cookieService: CookieService,
    ) {}
    
    @GraphQLSuccessMessage("TOTP code confirmed successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard, GraphQLTOTPGuard)
    @Mutation(() => ConfirmTotpResponse, {
        deprecationReason: "This mutation is deprecated. Use the privy authentication instead.",
        description: "Confirm a TOTP code for authentication.",
    })
    async confirmTotp(
        @GraphQLUser() user: UserJwtLike,
        @Context("res") res: Response,
    ): Promise<ConfirmTotpResponseData> {
        const { accessToken, refreshToken } = await this.authService.confirmTotp(user)
        if (!refreshToken) {
            // simple check to ensure type-safety
            throw new Error("Refresh token not found")
        }
        this.cookieService.attachHttpOnlyCookie(res, "refresh_token", refreshToken)
        return { accessToken }
    }

    @GraphQLSuccessMessage("JWT access token refreshed successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtRefreshTokenAuthGuard, GraphQLTOTPGuard)
    @Mutation(() => RefreshResponse, {
        deprecationReason: "This mutation is deprecated. Use the privy authentication instead.",
        description: "Refresh a JWT access token.",
    })
    async refresh(
        @GraphQLUser() user: UserJwtLike,
        @Context("res") res: Response,
    ): Promise<RefreshResponseData> {
        const { accessToken, refreshToken } = await this.authService.refresh(user)
        if (!refreshToken) {
            // simple check to ensure type-safety
            throw new Error("Refresh token not found")
        }
        this.cookieService.attachHttpOnlyCookie(res, "refresh_token", refreshToken)
        return { accessToken }
    }
}