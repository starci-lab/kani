import {
    Query, Resolver 
} from "@nestjs/graphql"
import {
    UserV2Service 
} from "./user-v2.service"
import {
    UserSchema 
} from "@modules/databases"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import {
    UserV2Response 
} from "./graphql-types"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    GraphQLSuccessMessage, GraphQLTransformInterceptor 
} from "@modules/api"
import {
    PrivyResponse 
} from "@modules/privy"
import {
    GraphQLJwtPrivyAuthGuard 
} from "@modules/privy"
import {
    VerifyAccessTokenResponse 
} from "@privy-io/node"

@Resolver()
export class UserV2Resolver {
    constructor(
        private readonly userV2Service: UserV2Service,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("User 2 fetched successfully")
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Query(() => UserV2Response,
        {
            description: "Fetch a single user v2 by their unique ID.",
        }
    )
    @UseInterceptors(GraphQLTransformInterceptor)
    async userV2(
        @PrivyResponse() response: VerifyAccessTokenResponse,
    ): Promise<UserSchema> {
        return this.userV2Service.userV2(response)
    }
}

