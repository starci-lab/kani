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
    GraphQLJwtOnlyMFAEnabledAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import {
    ReservesWithFeesRequest,
    ReservesWithFeesResponse,
    ReservesWithFeesResponseData,
} from "./reserves-with-fees.dto"
import {
    UseThrottler,
    ThrottlerConfig,
} from "@modules/throttler"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor,
} from "@modules/api"
import {
    ReservesWithFeesService,
} from "./reserves-with-fees.service"

@Resolver()
export class ReservesWithFeesResolver {
    constructor(
        private readonly reservesWithFeesService: ReservesWithFeesService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Reserves and fees fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtOnlyMFAEnabledAuthGuard)
    @Query(() => ReservesWithFeesResponse,
        {
            description: "Returns reserves and fees for a bot's active position (JWT/MFA auth).",
            deprecationReason: "Use reservesWithFeesV2 instead",
        })
    async reservesWithFees(
        @GraphQLUser() user: UserJwtLike,
        @Args("request",
            {
                description: "Input parameters to identify which bot's reserves and fees to fetch.",
            })
            request: ReservesWithFeesRequest,
    ): Promise<ReservesWithFeesResponseData> {
        return this.reservesWithFeesService.reservesWithFees(request,
            user)
    }
}
