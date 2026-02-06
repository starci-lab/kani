import {
    Args,
    Query,
    Resolver,
} from "@nestjs/graphql"
import {
    UseGuards,
    UseInterceptors,
} from "@nestjs/common"
import {
    PrivyResponse,
    GraphQLJwtPrivyAuthGuard,
} from "@modules/privy"
import {
    ReservesWithFeesV2Request,
    ReservesWithFeesV2Response,
    ReservesWithFeesV2ResponseData,
} from "./reserves-with-fees-v2.dto"
import {
    UseThrottler,
    ThrottlerConfig,
} from "@modules/throttler"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor,
} from "@modules/api"
import {
    ReservesWithFeesV2Service,
} from "./reserves-with-fees-v2.service"
import {
    VerifyAccessTokenResponse,
} from "@privy-io/node"

@Resolver()
export class ReservesWithFeesV2Resolver {
    constructor(
        private readonly reservesWithFeesV2Service: ReservesWithFeesV2Service,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Reserves and fees v2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => ReservesWithFeesV2Response,
        {
            description: "Returns reserves and fees for a bot's active position (v2 with Privy auth).",
        })
    async reservesWithFeesV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description: "Input parameters to identify which bot's reserves and fees to fetch.",
            })
            request: ReservesWithFeesV2Request,
    ): Promise<ReservesWithFeesV2ResponseData> {
        return this.reservesWithFeesV2Service.reservesWithFeesV2(request,
            response)
    }
}
