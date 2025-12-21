import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLJwtAccessTokenAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import {
    HistoryRequest,
    HistoryResponse,
    HistoryResponseData,
} from "./history.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { HistoryService } from "./history.service"

@Resolver()
export class HistoryResolver {
    constructor(
        private readonly historyService: HistoryService,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("History fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Query(() => HistoryResponse, {
        description:
            "Returns the history chart data of a specific bot.",
    })
    async history(
        @GraphQLUser() user: UserJwtLike,   
        @Args("request", {
            description:
                "Input parameters required to identify which history chart data should be fetched.",
        })
            request: HistoryRequest,
    ): Promise<HistoryResponseData> {
        return this.historyService.history(request, user)
    }
}

