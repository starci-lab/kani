import {
    Args, Query, Resolver 
} from "@nestjs/graphql"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import {
    GraphQLJwtAccessTokenAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import {
    PositionsRequest,
    PositionsResponse,
    PositionsResponseData,
} from "./positions.dto"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    GraphQLSuccessMessage, GraphQLTransformInterceptor 
} from "@modules/api"
import {
    PositionsService 
} from "./positions.service"

@Resolver()
export class PositionsResolver {
    constructor(
        private readonly positionsService: PositionsService,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Positions fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Query(() => PositionsResponse,
        {
            description:
            "Returns the positions associated with the current user.",
            deprecationReason: "Use v2 instead",
        })
    async positions(
        @GraphQLUser() user: UserJwtLike,   
        @Args("request",
            {
                description:
                "Input parameters required to identify which positions should be fetched.",
            })
            request: PositionsRequest,
    ): Promise<PositionsResponseData> {
        return this.positionsService.positions(request,
            user)
    }
}

