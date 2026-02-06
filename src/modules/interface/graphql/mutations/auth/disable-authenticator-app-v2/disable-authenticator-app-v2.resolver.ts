import {
    Args, Mutation, Resolver 
} from "@nestjs/graphql"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import {
    ThrottlerConfig, UseThrottler 
} from "@modules/throttler"
import {
    GraphQLJwtPrivyAuthGuard, PrivyResponse 
} from "@modules/privy"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor,
} from "@modules/api"
import {
    DisableAuthenticatorAppV2Service 
} from "./disable-authenticator-app-v2.service"
import {
    DisableAuthenticatorAppV2Request,
    DisableAuthenticatorAppV2Response,
} from "./graphql-types"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"

@Resolver()
export class DisableAuthenticatorAppV2Resolver {
    constructor(
        private readonly disableAuthenticatorAppV2Service: DisableAuthenticatorAppV2Service,
    ) {}
    
    @GraphQLSuccessMessage("Authenticator app disabled successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Mutation(() => DisableAuthenticatorAppV2Response,
        {
            description: "Confirm a TOTP code and disable authenticator app for the authenticated user (v2 with Privy authentication).",
        })
    async disableAuthenticatorAppV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description: "The request payload for disabling authenticator app v2.",
            })
            request: DisableAuthenticatorAppV2Request,
    ) {
        return this.disableAuthenticatorAppV2Service.disableAuthenticatorAppV2(response,
            request)
    }
}
