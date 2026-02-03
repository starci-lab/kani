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
} from "../../../interceptors"
import {
    EnableMFAV2Service 
} from "./enable-mfa-v2.service"
import {
    EnableMFAV2Request,
    EnableMFAV2Response,
    EnableMFAV2ResponseData,
} from "./enable-mfa-v2.dto"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"

@Resolver()
export class EnableMFAV2Resolver {
    constructor(
        private readonly enableMFAV2Service: EnableMFAV2Service,
    ) {}
    
    @GraphQLSuccessMessage("TOTP code confirmed and MFA enabled successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Mutation(() => EnableMFAV2Response,
        {
            description: "Confirm a TOTP code and enable MFA for the authenticated user (v2 with Privy authentication).",
        })
    async enableMFAV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description: "The request payload for enabling MFA v2.",
            })
            request: EnableMFAV2Request,
    ): Promise<EnableMFAV2ResponseData> {
        return this.enableMFAV2Service.enableMFAV2(response,
            request)
    }
}
