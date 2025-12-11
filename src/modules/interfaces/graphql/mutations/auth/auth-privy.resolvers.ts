import { Mutation, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler/throttler.decorators"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../interceptors"
import { AuthPrivyService } from "./auth-privy.service"
import { GraphQLPrivyAuthGuard, PrivyResponse } from "@modules/passport"
import { VerifyPrivyAuthTokenResponse, VerifyPrivyAuthTokenResponseData } from "./auth-privy.dto"
import { VerifyAuthTokenResponse } from "@privy-io/node"


@Resolver()
export class AuthPrivyResolvers {
    constructor(
        private readonly authPrivyService: AuthPrivyService,
    ) {}
    
    @GraphQLSuccessMessage("Privy authentication token verified successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLPrivyAuthGuard)
    @Mutation(() => VerifyPrivyAuthTokenResponse, {
        description: "Verify a Privy authentication token.",
    })
    async verifyPrivyAuthToken(
        @PrivyResponse() response: VerifyAuthTokenResponse,
    ): Promise<VerifyPrivyAuthTokenResponseData> {
        return await this.authPrivyService.verifyPrivyAuthToken(response)
    }
}