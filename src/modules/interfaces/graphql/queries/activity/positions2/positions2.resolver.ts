import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLJwtAccessTokenAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import {
    Positions2Request,
    Positions2Response,
    Positions2ResponseData,
} from "./positions2.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { Positions2Service } from "./positions2.service"

@Resolver()
export class Positions2Resolver {
    constructor(
        private readonly positions2Service: Positions2Service,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Positions fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Query(() => Positions2Response, {
        description:
            "Returns the positions associated with the current user.",
    })
    async positions2(
        @GraphQLUser() user: UserJwtLike,   
        @Args("request", {
            description:
                "Input parameters required to identify which positions should be fetched.",
        })
            request: Positions2Request,
    ): Promise<Positions2ResponseData> {
        return this.positions2Service.positions2(request, user)
    }
}

