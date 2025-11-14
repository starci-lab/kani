import { Args, Query, Resolver } from "@nestjs/graphql"
import { BotService } from "./bot.service"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLJwtOnlyVerifiedTOTPAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import {
    ExportedAccountRequest,
    ExportedAccountResponse,
    ExportedAccountResponseData,
    BotRequest,
    BotResponse,
} from "./bot.dto"
import { GraphQLTOTPGuard } from "@modules/totp"
import { UseThrottler, ThrottlerConfig } from "@modules/throttler"
import { GraphQLSuccessMessage, GraphQLTransformInterceptor } from "../../interceptors"
import { GraphQLJwtAccessTokenAuthGuard } from "@modules/passport"
import { BotSchema } from "@modules/databases/mongodb/primary/schemas"

@Resolver()
export class BotResolver {
    constructor(
        private readonly botService: BotService,
    ) { }
    
    @UseThrottler(ThrottlerConfig.Strict)
    @GraphQLSuccessMessage("Bot exported successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard, GraphQLTOTPGuard)
    @Query(() => ExportedAccountResponse, {
        description:
            "Returns the exported wallet keypair (account address and private key) associated with a specific bot. This operation requires TOTP verification for security.",
    })
    async exportedAccount(
        @GraphQLUser() user: UserJwtLike,
        @Args("request", {
            description:
                "Input parameters required to identify which liquidity provision bot's account should be exported.",
        })
            request: ExportedAccountRequest,
    ): Promise<ExportedAccountResponseData> {
        return this.botService.exportedAccount(request, user)
    }

    @UseThrottler(ThrottlerConfig.Strict)
    @GraphQLSuccessMessage("Bot fetched successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    //@UseGuards(GraphQLJwtOnlyVerifiedTOTPAuthGuard)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Query(() => BotResponse, {
        description:
            "Returns the details of a bot associated with the current user.",
    })
    async bot(
        @GraphQLUser() user: UserJwtLike,
        @Args("request", {
            description:
                "Input parameters required to identify which bot should be fetched.",
        })
            request: BotRequest,
    ): Promise<BotSchema> {
        return this.botService.bot(request, user)
    }
}
