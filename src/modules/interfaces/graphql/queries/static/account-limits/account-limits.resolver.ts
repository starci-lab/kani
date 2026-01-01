import { Query, Resolver } from "@nestjs/graphql"
import { AccountLimitsService } from "./account-limits.service"
import { GraphQLSuccessMessage } from "../../../interceptors"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { AccountLimitsResponse } from "./account-limits.dto"    
import { AccountLimitsConfig } from "@modules/databases"
import { GraphQLTransformInterceptor } from "../../../interceptors"
import { UseInterceptors } from "@nestjs/common"

@Resolver()
export class AccountLimitsResolver {
    constructor(
        private readonly accountLimitsService: AccountLimitsService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Account limits fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @Query(() => AccountLimitsResponse, {
        description: "Fetch all supported account limits.",
    })
    accountLimits(): AccountLimitsConfig {
        return this.accountLimitsService.accountLimits()
    }
}

