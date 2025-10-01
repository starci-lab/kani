import { Query, Resolver } from "@nestjs/graphql"
import { UsersService } from "./users.service"
import { UserSchema } from "@modules/databases"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import { GraphQLJwtAccessTokenAuthGuard, GraphQLUser, UserJwtLike } from "@modules/passport"
import { UserResponse } from "./users.dto"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../interceptors"

@Resolver()
export class UsersResolver {
    constructor(
        private readonly usersService: UsersService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("User fetched successfully")
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Query(() => UserResponse, {
        description: "Fetch a single user by their unique ID.",
    })
    @UseInterceptors(GraphQLTransformInterceptor)
    async user(
        @GraphQLUser() user: UserJwtLike,
    ): Promise<UserSchema> {
        return this.usersService.user(user.id)
    }
}