import { Injectable } from "@nestjs/common"
import { 
    BotSchema, 
    InjectPrimaryMongoose, 
} from "@modules/databases"
import { Connection } from "mongoose"
import { 
    BackupBotPrivateKeyRequest, 
    BackupBotPrivateKeyResponseData 
} from "./backup-bot-private-key.dto"
import { 
    BotNotFoundException, 
    BotNotOwnedByUserException, 
    BotAlreadyBackupedPrivateKeyException
} from "@exceptions"
import { UserJwtLike } from "@modules/passport"
import { SealedAesService } from "@modules/sealed"

@Injectable()
export class BackupBotPrivateKeyService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly sealedAesService: SealedAesService,
    ) { }

    async backupBotPrivateKey(
        userLike: UserJwtLike,
        { botId }: BackupBotPrivateKeyRequest,
    ): Promise<BackupBotPrivateKeyResponseData> {
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(botId)
        if (!bot) {
            throw new BotNotFoundException(botId)
        }
        if (bot.backupPrivateKey) {
            throw new BotAlreadyBackupedPrivateKeyException("Bot already backuped private key")
        }
        // check whether the user is the owner of the bot
        if (bot.user.toString() !== userLike.id) {
            throw new BotNotOwnedByUserException("User is not the owner of the bot")
        }
        const privateKey = await this.sealedAesService.decrypt(bot.encryptedPrivateKeyPayload)
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

