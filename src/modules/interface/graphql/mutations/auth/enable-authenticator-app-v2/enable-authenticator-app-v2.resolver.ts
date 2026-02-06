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
    EnableAuthenticatorAppV2Service 
} from "./enable-authenticator-app-v2.service"
import {
    EnableAuthenticatorAppV2Request,
    EnableAuthenticatorAppV2Response,
} from "./graphql-types"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"

@Resolver()
export class EnableAuthenticatorAppV2Resolver {
    constructor(
        private readonly enableAuthenticatorAppV2Service: EnableAuthenticatorAppV2Service,
    ) {}
    
    @GraphQLSuccessMessage("Authenticator app enabled successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Mutation(() => EnableAuthenticatorAppV2Response,
        {
            description: "Confirm a TOTP code and enable authenticator app for the authenticated user (v2 with Privy authentication).",
        })
    async enableAuthenticatorAppV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description: "The request payload for enabling authenticator app v2.",
            })
            request: EnableAuthenticatorAppV2Request,
    ) {
        return this.enableAuthenticatorAppV2Service.enableAuthenticatorAppV2(response,
            request)
    }
}
