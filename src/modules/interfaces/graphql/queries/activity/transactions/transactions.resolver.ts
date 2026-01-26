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
    TransactionsRequest,
    TransactionsResponse,
    TransactionsResponseData,
} from "./transactions.dto"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    GraphQLSuccessMessage, GraphQLTransformInterceptor 
} from "../../../interceptors"
import {
    TransactionsService 
} from "./transactions.service"

@Resolver()
export class TransactionsResolver {
    constructor(
        private readonly transactionsService: TransactionsService,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Transactions fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Query(() => TransactionsResponse,
        {
            description:
            "Returns the transactions associated with the current user.",
            deprecationReason: "Use v2 instead",
        })
    async transactions(
        @GraphQLUser() user: UserJwtLike,
        @Args("request",
            {
                description:
                "Input parameters required to identify which transactions should be fetched.",
            })
            request: TransactionsRequest,
    ): Promise<TransactionsResponseData> {
        return this.transactionsService.transactions(request,
            user)
    }
}

