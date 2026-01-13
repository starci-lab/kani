import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    PrivyResponse,
} from "@modules/privy"
import { GraphQLJwtPrivyAuthGuard } from "@modules/privy"
import {
    BotsV2Request,
    BotsV2Response,
    BotsV2ResponseData,
} from "./bots-v2.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { BotsV2Service } from "./bots-v2.service"
import { VerifyAccessTokenResponse } from "@privy-io/node"

@Resolver()
export class BotsV2Resolver {
    constructor(
        private readonly botsV2Service: BotsV2Service,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Bots v2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => BotsV2Response, {
        description:
            "Returns the bots associated with the current user.",
    })
    async botsV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request", {
            description:
                "Input parameters required to identify which bots should be fetched.",
        })
            request: BotsV2Request,
    ): Promise<BotsV2ResponseData> {
        return this.botsV2Service.botsV2(request, response)
    }
}

