import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLJwtOnlyMFAEnabledAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import {
    ReservesRequest,
    ReservesResponse,
    ReservesResponseData,
} from "./reserves.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { ReservesService } from "./reserves.service"

@Resolver()
export class ReservesResolver {
    constructor(
        private readonly reservesService: ReservesService,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Reserves fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtOnlyMFAEnabledAuthGuard)
    @Query(() => ReservesResponse, {
        description:
            "Returns the reserves associated with a bot.",
        deprecationReason: "Use v2 instead",
    })
    async reserves(
        @GraphQLUser() user: UserJwtLike,   
        @Args("request", {
            description:
                "Input parameters required to identify which bot's reserves should be fetched.",
        })
            request: ReservesRequest,
    ): Promise<ReservesResponseData> {
        return this.reservesService.reserves(request, user)
    }
}

