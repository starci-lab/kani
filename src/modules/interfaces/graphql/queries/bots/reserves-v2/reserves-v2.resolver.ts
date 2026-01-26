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
    ReservesV2Request,
    ReservesV2Response,
    ReservesV2ResponseData,
} from "./reserves-v2.dto"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    GraphQLSuccessMessage, GraphQLTransformInterceptor 
} from "../../../interceptors"
import {
    ReservesV2Service 
} from "./reserves-v2.service"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"

@Resolver()
export class ReservesV2Resolver {
    constructor(
        private readonly reservesV2Service: ReservesV2Service,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Reserves v2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => ReservesV2Response,
        {
            description:
            "Returns the reserves associated with a bot (v2 with Privy authentication).",
        })
    async reservesV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description:
                "Input parameters required to identify which bot's reserves should be fetched.",
            })
            request: ReservesV2Request,
    ): Promise<ReservesV2ResponseData> {
        return this.reservesV2Service.reservesV2(request,
            response)
    }
}

