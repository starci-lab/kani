import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    PrivyResponse,
} from "@modules/privy"
import { GraphQLJwtPrivyAuthGuard } from "@modules/privy"
import {
    PositionsV2Request,
    PositionsV2Response,
    PositionsV2ResponseData,
} from "./positions-v2.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { PositionsV2Service } from "./positions-v2.service"
import { VerifyAccessTokenResponse } from "@privy-io/node"

@Resolver()
export class PositionsV2Resolver {
    constructor(
        private readonly positionsV2Service: PositionsV2Service,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Positions v2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => PositionsV2Response, {
        description:
            "Returns the positions associated with the current user (v2 with Privy authentication).",
    })
    async positionsV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request", {
            description:
                "Input parameters required to identify which positions should be fetched.",
        })
            request: PositionsV2Request,
    ): Promise<PositionsV2ResponseData> {
        return this.positionsV2Service.positionsV2(request, response)
    }
}

