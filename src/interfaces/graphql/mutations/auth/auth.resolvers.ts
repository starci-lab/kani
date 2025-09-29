import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { AuthService } from "./auth.service"
import { UseGuards } from "@nestjs/common"
import { GraphQLUser, UserLike, JwtTemporaryAccessTokenAuthGuard } from "@modules/passport"
import { ConfirmTotpRequest, ConfirmTotpResponse } from "./auth.dto"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler/throttler.decorators"

@Resolver()
export class AuthResolvers {
    constructor(
        private readonly authService: AuthService,
    ) {}
    
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(JwtTemporaryAccessTokenAuthGuard)
    @Mutation(() => ConfirmTotpResponse, {
        description: "Confirm a TOTP code for authentication.",
    })
    async confirmTotp(
        @Args("request", { description: "The request to confirm the TOTP." }) request: ConfirmTotpRequest,  
        @GraphQLUser() user: UserLike,
    ): Promise<ConfirmTotpResponse> {
        return this.authService.confirmTotp(request, user)
    }
}