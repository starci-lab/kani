import { Args, Query, Resolver } from "@nestjs/graphql"
import { UsersService } from "./users.service"
import { UserSchema } from "@modules/databases"
import { UseGuards } from "@nestjs/common"
import { JwtAccessTokenAuthGuard, GraphQLUser } from "@modules/passport"

@Resolver(() => UserSchema)
export class UsersResolvers {
    constructor(
        private readonly usersService: UsersService,
    ) {}

    @UseGuards(JwtAccessTokenAuthGuard)
    @Query(() => UserSchema, {
        description: "Fetch a single user by their unique ID.",
    })
    async user(
        @Args("id", { description: "The unique ID of the user to retrieve." }) id: string,
        @GraphQLUser() user: UserSchema,
    ): Promise<UserSchema> {
        return this.usersService.queryUser(user.id)
    }
}