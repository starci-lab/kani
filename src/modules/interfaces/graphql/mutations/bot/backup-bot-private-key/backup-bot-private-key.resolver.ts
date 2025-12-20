import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import {
    GraphQLJwtOnlyMFAEnabledAuthGuard,
    GraphQLUser,
    UserJwtLike,
} from "@modules/passport"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor
} from "../../../interceptors"
import { BackupBotPrivateKeyService } from "./backup-bot-private-key.service"
import { 
    BackupBotPrivateKeyRequest,
    BackupBotPrivateKeyResponseData,
    BackupBotPrivateKeyResponse
} from "./backup-bot-private-key.dto"
import { GraphQLTOTPGuard } from "@modules/totp"
import { GraphQLEmailOtpGuard } from "@modules/mail"

@Resolver()
export class BackupBotPrivateKeyResolver {
    constructor(
        private readonly backupBotPrivateKeyService: BackupBotPrivateKeyService,
    ) { }

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
        return await this.backupBotPrivateKeyService.backupBotPrivateKey(user, request)
    }
}

