import { Injectable } from "@nestjs/common"
import { InjectMongoose, LiquidityProvisionBotSchema, UserSchema } from "@modules/databases"
import { Connection } from "mongoose"
import { AddLiquidityProvisionBotRequest, AddLiquidityProvisionBotResponseData } from "./liquidity-provision.dto"
import { UserJwtLike } from "@modules/passport"
import {
    UserNotFoundException,
} from "@modules/errors"
import { KeypairsService } from "@modules/blockchains"
import { chainIdToPlatformId } from "@modules/common"

@Injectable()
export class LiquidityProvisionService {
    constructor(
        @InjectMongoose()
        private readonly connection: Connection,
        private readonly keypairsService: KeypairsService,
    ) { }

    async addLiquidityProvisionBot(
        request: AddLiquidityProvisionBotRequest,
        userLike: UserJwtLike,
    ): Promise<AddLiquidityProvisionBotResponseData> {
        // we try to find the user in the database
        const exists = await this.connection.model<UserSchema>(UserSchema.name)
            .exists({ _id: userLike.id })
        if (!exists) {
            throw new UserNotFoundException()
        }
        // we create a new liquidity provision bot
        const platformId = chainIdToPlatformId(request.chainId)
        const wallet = await this.keypairsService.generateKeypair(platformId)
        const liquidityProvisionBot = await this.connection.model<LiquidityProvisionBotSchema>(LiquidityProvisionBotSchema.name).insertOne({
            user: userLike.id,
            chainId: request.chainId,
            accountAddress: wallet.accountAddress,
            encryptedPrivateKey: wallet.encryptedPrivateKey,
        })
        return {
            id: liquidityProvisionBot.id,
            accountAddress: wallet.accountAddress,
        }
    }
}