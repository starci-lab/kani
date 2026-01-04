import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    PositionSchema,
    PrimaryMemoryStorageService
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    FeesRequest,
    FeesResponseData,
} from "./fees.dto"
import { UserJwtLike } from "@modules/passport"
import { 
    ActivePositionNotFoundException, 
    BotNotFoundException, 
    BotNotOwnedByUserException, 
    LiquidityPoolNotFoundException 
} from "@exceptions"
import { FeesOrchestratorService } from "@modules/blockchains"

@Injectable()
export class FeesService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly feesOrchestratorService: FeesOrchestratorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }

    async fees(
        {
            botId
        }: FeesRequest,
        userLike: UserJwtLike,
    ): Promise<FeesResponseData> {
        // check if the bot exists
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(botId)
        if (!bot) {
            throw new BotNotFoundException("Bot not found")
        }
        // check if the bot is owned by the user
        if (bot.user.toString() !== userLike.id) {
            throw new BotNotOwnedByUserException("Bot not owned by user")
        }
        // get the active position
        const activePosition = await this.connection
            .model<PositionSchema>(PositionSchema.name)
            .findOne({
                bot: botId,
                isActive: true,
            })
        if (!activePosition) {
            throw new ActivePositionNotFoundException("Active position not found")
        }
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.id === activePosition.liquidityPool.toString())
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException("Liquidity pool not found")
        }
        // get the fees for the bot
        const fees = await this.feesOrchestratorService.fees({ bot, liquidityPoolId: liquidityPool.displayId })
        return {
            tokenA: fees.tokenA.toNumber(),
            tokenB: fees.tokenB.toNumber(),
        }
    }
}

