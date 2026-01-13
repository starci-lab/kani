import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    PrivyResponse,
} from "@modules/privy"
import { GraphQLJwtPrivyAuthGuard } from "@modules/privy"
import {
    Transactions2V2Request,
    Transactions2V2Response,
    Transactions2V2ResponseData,
} from "./transactions2-v2.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { Transactions2V2Service } from "./transactions2-v2.service"
import { VerifyAccessTokenResponse } from "@privy-io/node"

@Resolver()
export class Transactions2V2Resolver {
    constructor(
        private readonly transactions2V2Service: Transactions2V2Service,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Transactions v2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => Transactions2V2Response, {
        description:
            "Returns the transactions associated with the current user (v2 with Privy authentication).",
    })
    async transactions2V2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request", {
            description:
                "Input parameters required to identify which transactions should be fetched.",
        })
            request: Transactions2V2Request,
    ): Promise<Transactions2V2ResponseData> {
        return this.transactions2V2Service.transactions2V2(request, response)
    }
}

