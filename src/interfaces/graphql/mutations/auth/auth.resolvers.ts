import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { AuthService } from "./auth.service"
import { UseGuards, UseInterceptors, Res } from "@nestjs/common"
import { GraphQLUser, GraphQLJwtRefreshTokenAuthGuard, UserJwtLike } from "@modules/passport"
import { ConfirmTotpRequest, ConfirmTotpResponse, ConfirmTotpResponseData, RefreshResponse, RefreshResponseData } from "./auth.dto"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler/throttler.decorators"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../interceptors"
import { CookieService } from "@modules/cookie"
import { Response } from "express"

@Resolver()
export class AuthResolvers {
    constructor(
        private readonly authService: AuthService,
        private readonly cookieService: CookieService,
    ) {}
    
    @GraphQLSuccessMessage("TOTP code confirmed successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtRefreshTokenAuthGuard)
    @Mutation(() => ConfirmTotpResponse, {
        description: "Confirm a TOTP code for authentication.",
    })
    async confirmTotp(
        @Args("request", { description: "The request to confirm the TOTP." }) request: ConfirmTotpRequest,  
        @GraphQLUser() user: UserJwtLike,
        @Res() res: Response,
    ): Promise<ConfirmTotpResponseData> {
        const { accessToken, refreshToken } = await this.authService.confirmTotp(request, user)
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
    @UseGuards(GraphQLJwtRefreshTokenAuthGuard)
    @Mutation(() => RefreshResponse, {
        description: "Refresh a JWT access token.",
    })
    async refresh(
        @GraphQLUser() user: UserJwtLike,
        @Res() res: Response,
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