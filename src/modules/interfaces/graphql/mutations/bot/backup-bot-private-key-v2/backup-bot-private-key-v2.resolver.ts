import { Args, Mutation, Resolver } from "@nestjs/graphql"
import { UseGuards, UseInterceptors } from "@nestjs/common"
import { ThrottlerConfig } from "@modules/throttler"
import { UseThrottler } from "@modules/throttler"
import {
    GraphQLSuccessMessage,
    GraphQLTransformInterceptor
} from "../../../interceptors"
import { BackupBotPrivateKeyV2Service } from "./backup-bot-private-key-v2.service"
import { 
    BackupBotPrivateKeyV2Request,
    BackupBotPrivateKeyV2ResponseData,
    BackupBotPrivateKeyV2Response
} from "./backup-bot-private-key-v2.dto"
import { VerifyAccessTokenResponse } from "@privy-io/node"
import { GraphQLJwtPrivyAuthGuard, PrivyResponse } from "@modules/privy"
import { GraphQLJwtAccessToken } from "@modules/passport"

@Resolver()
export class BackupBotPrivateKeyV2Resolver {
    constructor(
        private readonly backupBotPrivateKeyV2Service: BackupBotPrivateKeyV2Service,
    ) { }

    @GraphQLSuccessMessage("Bot private key exported successfully")
    @UseInterceptors(GraphQLTransformInterceptor)
    @UseThrottler(ThrottlerConfig.Strict)
    @UseGuards(GraphQLJwtPrivyAuthGuard)
    @Mutation(() => BackupBotPrivateKeyV2Response, {
        description: "Backups the private key of a bot for the authenticated user (v2 with Privy authentication)."
    })
    async backupBotPrivateKeyV2(
        @GraphQLJwtAccessToken() accessToken: string,
        @PrivyResponse() response: VerifyAccessTokenResponse,
        @Args("request", { description: "The request payload for backing up a bot's private key." })
            request: BackupBotPrivateKeyV2Request,
    ): Promise<BackupBotPrivateKeyV2ResponseData> {
        return await this.backupBotPrivateKeyV2Service.backupBotPrivateKeyV2(accessToken, response, request)
    }
}

