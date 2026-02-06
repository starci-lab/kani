import {
    Args, Query, Resolver 
} from "@nestjs/graphql"
import {
    UseGuards, UseInterceptors 
} from "@nestjs/common"
import {
    GraphQLJwtOnlyMFAEnabledAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import {
    BotRequest,
    BotResponse,
} from "./graphql-types"
import {
    UseThrottler, ThrottlerConfig 
} from "@modules/throttler"
import {
    GraphQLSuccessMessage, GraphQLTransformInterceptor 
} from "@modules/api"
import {
    BotSchema 
} from "@modules/databases"
import {
    BotService 
} from "./bot.service"

@Resolver()
export class BotResolver {
    constructor(
        private readonly botService: BotService,
    ) { }

    @UseThrottler(ThrottlerConfig.Soft)
    @GraphQLSuccessMessage("Bot fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtOnlyMFAEnabledAuthGuard)
    @Query(() => BotResponse,
        {
            description:
            "Returns the details of a bot associated with the current user.",
            deprecationReason: "Use v2 instead",
        })
    async bot(
        @GraphQLUser() user: UserJwtLike,
        @Args("request",
            {
                description:
                "Input parameters required to identify which bot should be fetched.",
            })
            request: BotRequest,
    ): Promise<BotSchema> {
        return this.botService.bot(request,
            user)
    }
}

