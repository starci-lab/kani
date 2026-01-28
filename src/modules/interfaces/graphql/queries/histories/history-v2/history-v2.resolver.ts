import {
    Args, Query, Resolver 
} from "@nestjs/graphql"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import {
    PrivyResponse,
} from "@modules/privy"
import {
    GraphQLJwtPrivyAuthGuard 
} from "@modules/privy"
import {
    HistoryV2Request,
    HistoryV2Response,
    HistoryV2ResponseData,
} from "./history-v2.dto"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    GraphQLSuccessMessage, GraphQLTransformInterceptor 
} from "../../../interceptors"
import {
    HistoryV2Service 
} from "./history-v2.service"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"

@Resolver()
export class HistoryV2Resolver {
    constructor(
        private readonly historyV2Service: HistoryV2Service,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("History v2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => HistoryV2Response,
        {
            description:
            "Returns the history chart data of a specific bot (v2 with Privy authentication).",
        })
    async historyV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description:
                "Input parameters required to identify which history chart data should be fetched.",
            })
            request: HistoryV2Request,
    ): Promise<HistoryV2ResponseData> {
        return this.historyV2Service.historyV2(request,
            response)
    }
}

