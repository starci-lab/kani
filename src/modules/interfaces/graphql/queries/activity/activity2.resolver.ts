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
    Transactions2Request,
    Transactions2Response,
    Transactions2ResponseData,
} from "./activity2.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../interceptors"
import { Activity2Service } from "./activity2.service"

@Resolver()
export class Activity2Resolver {
    constructor(
        private readonly activity2Service: Activity2Service,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Transactions fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Query(() => Transactions2Response, {
        description:
            "Returns the transactions associated with the current user.",
    })
    async transactions2(
        @GraphQLUser() user: UserJwtLike,
        @Args("request", {
            description:
                "Input parameters required to identify which transactions should be fetched.",
        })
            request: Transactions2Request,
    ): Promise<Transactions2ResponseData> {
        return this.activity2Service.transactions2(request, user)
    }

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
        return this.activity2Service.positions2(request, user)
    }
}
