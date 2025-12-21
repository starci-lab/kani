import { Args, Query, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLJwtAccessTokenAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import {
    Transactions2Request,
    Transactions2Response,
    Transactions2ResponseData,
} from "./transactions2.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../../interceptors"
import { Transactions2Service } from "./transactions2.service"

@Resolver()
export class Transactions2Resolver {
    constructor(
        private readonly transactions2Service: Transactions2Service,
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
        return this.transactions2Service.transactions2(request, user)
    }
}

