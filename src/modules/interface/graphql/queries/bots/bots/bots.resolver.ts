import {
    Args, Query, Resolver 
} from "@nestjs/graphql"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import {
    GraphQLJwtOnlyMFAEnabledAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import {
    BotsRequest,
    BotsResponse,
    BotsResponseData,
} from "./bots.dto"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    GraphQLSuccessMessage, GraphQLTransformInterceptor 
} from "@modules/api"
import {
    BotsService 
} from "./bots.service"

@Resolver()
export class BotsResolver {
    constructor(
        private readonly botsService: BotsService,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Bots fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtOnlyMFAEnabledAuthGuard)
    @Query(() => BotsResponse,
        {
            description:
            "Returns the bots associated with the current user.",
            deprecationReason: "Use v2 instead",
        })
    async bots(
        @GraphQLUser() user: UserJwtLike,   
        @Args("request",
            {
                description:
                "Input parameters required to identify which bots should be fetched.",
            })
            request: BotsRequest,
    ): Promise<BotsResponseData> {
        return this.botsService.bots(request,
            user)
    }
}

