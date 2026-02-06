import {
    Query, Resolver 
} from "@nestjs/graphql"
import {
    AccountLimitsService 
} from "./account-limits.service"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    AccountLimitsResponse 
} from "./graphql-types"    
import {
    AccountLimitsConfig 
} from "@modules/databases"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor 
} from "@modules/api"
import {
    UseInterceptors 
} from "@nestjs/common"

@Resolver()
export class AccountLimitsResolver {
    constructor(
        private readonly accountLimitsService: AccountLimitsService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Account limits fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @Query(() => AccountLimitsResponse,
        {
            description: "Fetch all supported account limits.",
        })
    accountLimits(): AccountLimitsConfig {
        return this.accountLimitsService.accountLimits()
    }
}

