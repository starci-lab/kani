import { Injectable } from "@nestjs/common"

import { InjectMongoose, LiquidityProvisionBotSchema, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { UserNotFoundException } from "@modules/errors"
import { 
    ExportedAccountRequest, 
    ExportedAccountResponseData,
    LiquidityProvisionBotRequest,
} from "./liquidity-provision-bot.dto"
import { KeypairsService } from "@modules/blockchains"
import { LiquidityProvisionBotNotFoundException } from "@modules/errors"
import { chainIdToPlatformId } from "@modules/common"
import { UserJwtLike } from "@modules/passport"

@Injectable()
export class LiquidityProvisionBotService {
    constructor(
        @InjectMongoose()
        private readonly connection: Connection,
        private readonly keypairsService: KeypairsService,
    ) {}

    // return the exported account for a liquidity provision bot
    async exportedAccount(
        { id }: ExportedAccountRequest,
        userLike: UserJwtLike,
    ): Promise<ExportedAccountResponseData> {
        const user = await this.connection.model<UserSchema>(UserSchema.name).findById(userLike.id)
        // set the temporary totp token if the user is not verified
        if (!user) {
            throw new UserNotFoundException()
        }
        const liquidityProvisionBot = await this.connection
            .model<LiquidityProvisionBotSchema>(
                LiquidityProvisionBotSchema.name).findById(id)
        if (!liquidityProvisionBot) {
            throw new LiquidityProvisionBotNotFoundException()
        }
        const platformId = chainIdToPlatformId(liquidityProvisionBot.chainId)
        const privateKey = await this.keypairsService.getPrivateKey(
            platformId, liquidityProvisionBot.encryptedPrivateKey)
        return {
            accountAddress: liquidityProvisionBot.accountAddress,
            privateKey,
        }
    }   

    async liquidityProvisionBot(
        { id }: LiquidityProvisionBotRequest,
        userLike: UserJwtLike,
    ): Promise<LiquidityProvisionBotSchema> {
        const liquidityProvisionBot = await this.connection
            .model<LiquidityProvisionBotSchema>(
                LiquidityProvisionBotSchema.name).findOne({
                user: userLike.id,
                _id: id,
            })
        if (!liquidityProvisionBot) {
            throw new LiquidityProvisionBotNotFoundException()
        }
        return liquidityProvisionBot
    }
}