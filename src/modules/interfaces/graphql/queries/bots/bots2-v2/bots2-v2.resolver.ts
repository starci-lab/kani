import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    PrivyResponse,
} from "@modules/privy"
import { GraphQLJwtPrivyAuthGuard } from "@modules/privy"
import {
    Bots2V2Request,
    Bots2V2Response,
    Bots2V2ResponseData,
} from "./bots2-v2.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { Bots2V2Service } from "./bots2-v2.service"
import { VerifyAccessTokenResponse } from "@privy-io/node"

@Resolver()
export class Bots2V2Resolver {
    constructor(
        private readonly bots2V2Service: Bots2V2Service,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Bots v2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => Bots2V2Response, {
        description:
            "Returns the bots associated with the current user (v2 with Privy authentication).",
    })
    async bots2V2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request", {
            description:
                "Input parameters required to identify which bots should be fetched.",
        })
            request: Bots2V2Request,
    ): Promise<Bots2V2ResponseData> {
        return this.bots2V2Service.bots2V2(request, response)
    }
}

