import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLJwtOnlyMFAEnabledAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import {
    Bots2Request,
    Bots2Response,
    Bots2ResponseData,
} from "./bots2.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { Bots2Service } from "./bots2.service"

@Resolver()
export class Bots2Resolver {
    constructor(
        private readonly bots2Service: Bots2Service,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Bots fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtOnlyMFAEnabledAuthGuard)
    @Query(() => Bots2Response, {
        description:
            "Returns the bots associated with the current user.",
    })
    async bots2(
        @GraphQLUser() user: UserJwtLike,   
        @Args("request", {
            description:
                "Input parameters required to identify which bots should be fetched.",
        })
            request: Bots2Request,
    ): Promise<Bots2ResponseData> {
        return this.bots2Service.bots2(request, user)
    }
}

