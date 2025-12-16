import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLJwtAccessTokenAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import {
    PositionsRequest,
    PositionsResponse,
    PositionsResponseData,
    TransactionsRequest,
    TransactionsResponse,
    TransactionsResponseData,
} from "./activity.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../interceptors"
import { ActivityService } from "./activity.service"

@Resolver()
export class ActivityResolver {
    constructor(
        private readonly activityService: ActivityService,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Transactions fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Query(() => TransactionsResponse, {
        description:
            "Returns the transactions associated with the current user.",
    })
    async transactions(
        @GraphQLUser() user: UserJwtLike,
        @Args("request", {
            description:
                "Input parameters required to identify which transactions should be fetched.",
        })
            request: TransactionsRequest,
    ): Promise<TransactionsResponseData> {
        return this.activityService.transactions(request, user)
    }

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Positions fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Query(() => PositionsResponse, {
        description:
            "Returns the positions associated with the current user.",
    })
    async positions(
        @GraphQLUser() user: UserJwtLike,   
        @Args("request", {
            description:
                "Input parameters required to identify which positions should be fetched.",
        })
            request: PositionsRequest,
    ): Promise<PositionsResponseData> {
        return this.activityService.positions(request, user)
    }
}
