import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    PrivyResponse,
} from "@modules/privy"
import { GraphQLJwtPrivyAuthGuard } from "@modules/privy"
import {
    Positions2V2Request,
    Positions2V2Response,
    Positions2V2ResponseData,
} from "./positions2-v2.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { Positions2V2Service } from "./positions2-v2.service"
import { VerifyAccessTokenResponse } from "@privy-io/node"

@Resolver()
export class Positions2V2Resolver {
    constructor(
        private readonly positions2V2Service: Positions2V2Service,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Positions v2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => Positions2V2Response, {
        description:
            "Returns the positions associated with the current user (v2 with Privy authentication).",
    })
    async positions2V2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request", {
            description:
                "Input parameters required to identify which positions should be fetched.",
        })
            request: Positions2V2Request,
    ): Promise<Positions2V2ResponseData> {
        return this.positions2V2Service.positions2V2(request, response)
    }
}

