import { Query, Resolver } from "@nestjs/graphql"
import { UsersService } from "./users.service"
import { UserSchema } from "@modules/databases"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import { GraphQLPrivyAuthGuard, GraphQLUser, PrivyResponse, UserJwtLike } from "@modules/passport"
import { UserResponse } from "./users.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../interceptors"
import { VerifyAuthTokenResponse } from "@privy-io/node"

@Resolver()
export class UsersResolver {
    constructor(
        private readonly usersService: UsersService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("User fetched successfully")
    @UseGuards(GraphQLPrivyAuthGuard)
    @Query(() => UserResponse, {
        description: "Fetch a single user by their unique ID.",
    })
    @UseInterceptors(GraphQLTransformInterceptor)
    async user(
        @PrivyResponse() response: VerifyAuthTokenResponse,
    ): Promise<UserSchema> {
        return this.usersService.user(response)
    }
}