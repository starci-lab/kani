import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLJwtAccessTokenAuthGuard,
    GraphQLJwtOnlyMFAEnabledAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor
} from "../../interceptors"
import { BotV2Service } from "./bot-v2.service"
import { 
    CreateBotRequest, 
    CreateBotResponseData, 
    CreateBotResponse, 
    BackupBotPrivateKeyRequest,
    BackupBotPrivateKeyResponseData,
    BackupBotPrivateKeyResponse
} from "./bot-v2.dto"
import { GraphQLTOTPGuard } from "@modules/totp"
import { GraphQLEmailOtpGuard } from "@modules/mail"

@Resolver()
export class BotV2Resolver {
    constructor(
        private readonly botV2Service: BotV2Service,
    ) { }

    /**
     * Mutation for creating a new bot.
     * Requires a valid refresh token for authentication.
     */
    @GraphQLSuccessMessage("Bot created successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtAccessTokenAuthGuard)
    @Mutation(() => CreateBotResponse, {
        description: "Creates a new bot for the authenticated user."
    })
    async createBot(
        @GraphQLUser() user: UserJwtLike,
        @Args("request", { description: "The request payload for creating a new bot." })
            request: CreateBotRequest,
    ): Promise<CreateBotResponseData> {
        return await this.botV2Service.createBot(user, request)
    }

    @GraphQLSuccessMessage("Bot private key exported successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(
        GraphQLJwtOnlyMFAEnabledAuthGuard, 
        GraphQLTOTPGuard,
        GraphQLEmailOtpGuard
    )
    @Mutation(() => BackupBotPrivateKeyResponse, {
        description: "Backups the private key of a bot for the authenticated user."
    })
    async backupBotPrivateKey(
        @GraphQLUser() user: UserJwtLike,
        @Args("request", { description: "The request payload for backing up a bot's private key." })
            request: BackupBotPrivateKeyRequest,
    ): Promise<BackupBotPrivateKeyResponseData> {
        return await this.botV2Service.backupBotPrivateKey(user, request)
    }
}