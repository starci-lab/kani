import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLJwtOnlyMFAEnabledAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import {
    FeesRequest,
    FeesResponse,
    FeesResponseData,
} from "./fees.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { FeesService } from "./reserves.service"

@Resolver()
export class FeesResolver {
    constructor(
        private readonly feesService: FeesService,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Fees fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtOnlyMFAEnabledAuthGuard)
    @Query(() => FeesResponse, {
        description:
            "Returns the fees associated with a bot.",
    })
    async fees(
        @GraphQLUser() user: UserJwtLike,   
        @Args("request", {
            description:
                "Input parameters required to identify which bot's fees should be fetched.",
        })
            request: FeesRequest,
    ): Promise<FeesResponseData> {
        return this.feesService.fees(request, user)
    }
}

