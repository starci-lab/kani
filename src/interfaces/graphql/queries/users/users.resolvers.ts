import { Query, Resolver } from "@nestjs/graphql"
import { UsersService } from "./users.service"
import { UserSchema } from "@modules/databases"
import { UseGuards } from "@nestjs/common"
import { GraphQLJwtAccessTokenAuthGuard, GraphQLUser } from "@modules/passport"

@Resolver()
export class UsersResolvers {
    constructor(
        private readonly usersService: UsersService,
    ) {}

    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Query(() => UserSchema, {
        description: "Fetch a single user by their unique ID.",
    })
    async user(
        @GraphQLUser() user: UserSchema,
    ): Promise<UserSchema> {
        return this.usersService.queryUser(user.id)
    }
}