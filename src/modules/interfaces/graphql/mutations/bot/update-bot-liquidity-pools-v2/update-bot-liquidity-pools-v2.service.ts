import { Injectable } from "@nestjs/common"
import { 
    AppVersion, 
    BotSchema, 
    InjectPrimaryMongoose, 
    PrimaryMemoryStorageService, 
    UserSchema 
} from "@modules/databases"
import { Connection } from "mongoose"
import { 
    BotNotFoundException, 
    BotNotOwnedByUserException, 
    BotNotV2Exception, 
    SomeLiquidityPoolsNotFoundException, 
    UserNotFoundException 
} from "@modules/exceptions"
import { UpdateBotLiquidityPoolsV2Request } from "./update-bot-liquidity-pools-v2.dto"
import { VerifyAccessTokenResponse } from "@privy-io/node"

@Injectable()
export class UpdateBotLiquidityPoolsV2Service {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    async updateBotLiquidityPoolsV2(
        {
            id,
            liquidityPoolIds,
        }: UpdateBotLiquidityPoolsV2Request,
        response: VerifyAccessTokenResponse,
    ) {
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({ privyUserId: response.user_id })
        if (!user) {
            throw new UserNotFoundException("User not found with privy user id: " + response.user_id)
        }
        // we try to find the bot in the database
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(id)
        if (!bot) {
            throw new BotNotFoundException("Bot not found with id: " + id)
        }
        // check whether the user is the owner of the bot
        if (bot.user.toString() !== user.id) {
            throw new BotNotOwnedByUserException("User is not the owner of the bot")
        }
        // check if bot is v2
        if (bot.version !== AppVersion.V2) {
            throw new BotNotV2Exception("Bot is not v2. Please use updateBotLiquidityPoolsV2 mutation for v2 bots.")
        }
        const liquidityPools = this.primaryMemoryStorageService.liquidityPools.filter((liquidityPool) => liquidityPoolIds.includes(liquidityPool.id))
        if (liquidityPools.length !== liquidityPoolIds.length) {
            throw new SomeLiquidityPoolsNotFoundException(liquidityPoolIds)
        }
        // we update the bot liquidity pools
        await this.connection.model<BotSchema>(BotSchema.name).updateOne(
            { _id: id },
            { $set: 
                { 
                    liquidityPools: liquidityPools.map((liquidityPool) => liquidityPool.id) 
                } 
            }
        )
    }
}


