import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    PrivyResponse,
} from "@modules/privy"
import { GraphQLJwtPrivyAuthGuard } from "@modules/privy"
import {
    FeesV2Request,
    FeesV2Response,
    FeesV2ResponseData,
} from "./fees-v2.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { FeesV2Service } from "./fees-v2.service"
import { VerifyAccessTokenResponse } from "@privy-io/node"

@Resolver()
export class FeesV2Resolver {
    constructor(
        private readonly feesV2Service: FeesV2Service,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Fees v2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => FeesV2Response, {
        description:
            "Returns the fees associated with a bot (v2 with Privy authentication).",
    })
    async feesV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request", {
            description:
                "Input parameters required to identify which bot's fees should be fetched.",
        })
            request: FeesV2Request,
    ): Promise<FeesV2ResponseData> {
        return this.feesV2Service.feesV2(request, response)
    }
}

