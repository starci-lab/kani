import {
    Query, Resolver 
} from "@nestjs/graphql"
import {
    UserService 
} from "./user.service"
import {
    UserSchema 
} from "@modules/databases"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import {
    GraphQLJwtAccessTokenAuthGuard, GraphQLUser 
} from "@modules/passport"
import {
    UserResponse 
} from "./user.dto"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    GraphQLSuccessMessage, GraphQLTransformInterceptor 
} from "@modules/api"
import {
    UserJwtLike 
} from "@modules/passport"

@Resolver()
export class UserResolver {
    constructor(
        private readonly userService: UserService,
    ) {}

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("User fetched successfully")
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Query(() => UserResponse,
        {
            description: "Fetch a single user by their unique ID.",
            deprecationReason: "Use v2 instead",
        })
    @UseInterceptors(GraphQLTransformInterceptor)
    async user(
        @GraphQLUser() user: UserJwtLike,
    ): Promise<UserSchema> {
        return this.userService.user(user)
    }
}

