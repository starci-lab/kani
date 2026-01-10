import { Injectable } from "@nestjs/common"
import { 
    BotSchema, 
    InjectPrimaryMongoose, 
    UserSchema,
    AppVersion,
} from "@modules/databases"
import { Connection } from "mongoose"
import { 
    BackupBotPrivateKeyV2Request, 
    BackupBotPrivateKeyV2ResponseData 
} from "./backup-bot-private-key-v2.dto"
import { 
    BotNotFoundException, 
    BotNotOwnedByUserException, 
    BotAlreadyBackupedPrivateKeyException,
    UserNotFoundException,
    BotNotV2Exception,
} from "@exceptions"
import { VerifyAccessTokenResponse } from "@privy-io/node"
import { DerivedAesKeyService } from "@modules/derived"

@Injectable()
export class BackupBotPrivateKeyV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly derivedAesKeyService: DerivedAesKeyService,
    ) { }

    async backupBotPrivateKeyV2(
        response: VerifyAccessTokenResponse,
        { botId }: BackupBotPrivateKeyV2Request,
    ): Promise<BackupBotPrivateKeyV2ResponseData> {
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({ privyUserId: response.user_id })
        if (!user) {
            throw new UserNotFoundException("User not found with privy user id: " + response.user_id)
        }
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(botId)
        if (!bot) {
            throw new BotNotFoundException(botId)
        }
        // check if bot is v2
        if (bot.version !== AppVersion.V2) {
            throw new BotNotV2Exception("Bot is not v2. Please use backupBotPrivateKey mutation for v1 bots.")
        }
        if (bot.backupPrivateKey) {
            throw new BotAlreadyBackupedPrivateKeyException("Bot already backuped private key")
        }
        // check whether the user is the owner of the bot
        if (bot.user.toString() !== user.id) {
            throw new BotNotOwnedByUserException("User is not the owner of the bot")
        }
        // use encryptedPrivySignerPrivateKeyPayload for v2 bots
        if (!bot.encryptedPrivySignerPrivateKeyPayload) {
            throw new BotNotFoundException("Bot v2 does not have privy signer private key")
        }
        const privateKey = this.derivedAesKeyService.decrypt(bot.encryptedPrivySignerPrivateKeyPayload)
        // update the bot backup private key
        await this.connection.model<BotSchema>(BotSchema.name).updateOne(
            { _id: botId },
            { $set: { backupPrivateKey: true } }
        )
        return {
            privateKey,
        }   
    }
}

