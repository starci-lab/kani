import {
    Args, Query, Resolver 
} from "@nestjs/graphql"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import {
    PrivyResponse,
} from "@modules/privy"
import {
    GraphQLJwtPrivyAuthGuard 
} from "@modules/privy"
import {
    TransactionsV2Request,
    TransactionsV2Response,
    TransactionsV2ResponseData,
} from "./graphql-types"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    GraphQLSuccessMessage, GraphQLTransformInterceptor 
} from "@modules/api"
import {
    TransactionsV2Service 
} from "./transactions-v2.service"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"

@Resolver()
export class TransactionsV2Resolver {
    constructor(
        private readonly transactionsV2Service: TransactionsV2Service,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Transactions v2 fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => TransactionsV2Response,
        {
            description:
            "Returns the transactions associated with the current user (v2 with Privy authentication).",
        })
    async transactionsV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request",
            {
                description:
                "Input parameters required to identify which transactions should be fetched.",
            })
            request: TransactionsV2Request,
    ): Promise<TransactionsV2ResponseData> {
        return this.transactionsV2Service.transactionsV2(request,
            response)
    }
}

