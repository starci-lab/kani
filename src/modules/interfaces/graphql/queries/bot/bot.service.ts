import { Injectable } from "@nestjs/common"

import { InjectPrimaryMongoose, BotSchema, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { UserNotFoundException } from "@modules/errors"
import { 
    ExportedAccountRequest, 
    ExportedAccountResponseData,
    BotRequest,
} from "./bot.dto"
import { KeypairsService } from "@modules/blockchains"
import { BotNotFoundException } from "@exceptions"
import { chainIdToPlatformId } from "@typedefs"
import { UserJwtLike } from "@modules/passport"

@Injectable()
export class BotService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly keypairsService: KeypairsService,
    ) {}

    // return the exported account for a bot
    async exportedAccount(
        { id }: ExportedAccountRequest,
        userLike: UserJwtLike,
    ): Promise<ExportedAccountResponseData> {
        const user = await this.connection.model<UserSchema>(UserSchema.name).findById(userLike.id)
        // set the temporary totp token if the user is not verified
        if (!user) {
            throw new UserNotFoundException()
        }
        const bot = await this.connection
            .model<BotSchema>(
                BotSchema.name).findById(id)
        if (!bot) {
            throw new BotNotFoundException()
        }
        const platformId = chainIdToPlatformId(bot.chainId)
        const privateKey = this.keypairsService.getPrivateKey(
            platformId, bot.encryptedPrivateKey)
        return {
            accountAddress: bot.accountAddress,
            privateKey,
        }
    }   

    async bot(
        { id }: BotRequest,
        userLike: UserJwtLike,
    ): Promise<BotSchema> {
        const bot = await this.connection
            .model<BotSchema>(
                BotSchema.name).findOne({
                user: userLike.id,
                _id: id,
            })
        if (!bot) {
            throw new BotNotFoundException()
        }
        return bot
    }
}