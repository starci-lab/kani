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
} from "@modules/exceptions"
import { FeesOrchestratorService } from "@modules/blockchains"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { InjectSuperJson, DayjsService } from "@modules/mixin"
import SuperJSON from "superjson"
import { envConfig } from "@modules/env"

@Injectable()
export class FeesService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly feesOrchestratorService: FeesOrchestratorService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly dayjsService: DayjsService,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
    ) { }

    async fees(
        {
            botId,
            activePositionId,
        }: FeesRequest,
        userLike: UserJwtLike,
    ): Promise<FeesResponseData> {
        // check if the fees are cached
        const cachedResult = await this.cacheManager.get<string>
        (
            createCacheKey(
                CacheKey.FeesResponse, 
                {
                    botId,
                    activePositionId,
                    userId: userLike.id,
                }
            )
        )
        // if the fees are cached, return them
        // if (cachedResult) {
        //     return this.superjson.parse<FeesResponseData>(cachedResult)
        // }
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
        if (!activePosition || activePosition.id.toString() !== activePositionId) {
            throw new ActivePositionNotFoundException("Active position not found")
        }
        // set the active position on the bot
        bot.activePosition = activePosition
        // get the liquidity pool
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.id === activePosition.liquidityPool.toString())
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException("Liquidity pool not found")
        }
        // get the fees for the bot
        const fees = await this.feesOrchestratorService.fees({ bot, liquidityPoolId: liquidityPool.displayId })
        // cache the fees
        const lastFetchedAt = this.dayjsService.now()
        const response: FeesResponseData = {
            tokenA: fees.tokenA.toNumber(),
            tokenB: fees.tokenB.toNumber(),
            lastFetchedAt: lastFetchedAt.toDate(),
            lastSnapshotAt: fees.snapshotAt.toDate(),
        }
        await this.cacheManager.set(
            createCacheKey(
                CacheKey.FeesResponse, 
                {
                    botId,
                    activePositionId,
                    userId: userLike.id,
                }
            ),
            this.superjson.stringify(response),
            envConfig().cache.ttl.responses.fees,
        )
        return response
    }
}
