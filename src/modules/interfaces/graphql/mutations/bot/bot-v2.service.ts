import { 
    BotSchema, 
    InjectPrimaryMongoose, 
    UserSchema 
} from "@modules/databases"
import { Injectable } from "@nestjs/common"
import { Connection } from "mongoose"
import { CreateBotRequest, CreateBotResponseData } from "./bot-v2.dto"
import { VerifyAuthTokenResponse } from "@privy-io/node"
import { UserNotFoundException } from "@exceptions"
import { InjectPrivy, PrivyService } from "@modules/privy"
import { PrivyClient } from "@privy-io/node"
import { chainIdToPlatformId } from "@typedefs"

@Injectable()
export class BotV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly privyService: PrivyService,
        @InjectPrivy()
        private readonly privyClient: PrivyClient,
    ) { }

    async createBot(
        response: VerifyAuthTokenResponse,
        {
            name,
            chainId,
            targetTokenId,
            quoteTokenId,
            liquidityPoolIds,
        }: CreateBotRequest,
    ): Promise<CreateBotResponseData> {
        // we retrieve the user from the database based on the privy user id
        const user = await this.connection.model<UserSchema>(
            UserSchema.name
        ).findOne({
            privyUserId: response.user_id,
        })
        if (!user) {
            throw new UserNotFoundException("User not found with privy user id: " + response.user_id)
        }
        // create wallet
        const wallet = await this.privyClient.wallets().create({
            chain_type: this.privyService.getWalletType(chainIdToPlatformId(chainId)),
            owner_id: response.user_id,
        })
        const [botRaw] = await this.connection.model<BotSchema>(BotSchema.name).create([{
            user: user.id,
            name,
            chainId,
            targetTokenId,
            quoteTokenId,
            liquidityPoolIds,
            privyWalletId: wallet.id,
            accountAddress: wallet.address,
        }])
        const bot = botRaw.toJSON()
        return {
            id: bot.id,
            accountAddress: "",
        }
    }
}