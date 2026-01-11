import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    PositionSchema,
    PrimaryMemoryStorageService,
    UserSchema,
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    FeesV2Request,
    FeesV2ResponseData,
} from "./fees-v2.dto"
import { VerifyAccessTokenResponse } from "@privy-io/node"
import { 
    ActivePositionNotFoundException, 
    BotNotFoundException, 
    BotNotOwnedByUserException, 
    LiquidityPoolNotFoundException,
    UserNotFoundException,
} from "@exceptions"
import { FeesOrchestratorService } from "@modules/blockchains"
import { CacheKey, createCacheKey, InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { InjectSuperJson, DayjsService } from "@modules/mixin"
import SuperJSON from "superjson"
import { envConfig } from "@modules/env"

@Injectable()
export class FeesV2Service {
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

    async feesV2(
        {
            botId,
            activePositionId,
        }: FeesV2Request,
        response: VerifyAccessTokenResponse,
    ): Promise<FeesV2ResponseData> {
        // retrieve the user from the response
        const user = await this.connection
            .model<UserSchema>(UserSchema.name)
            .findOne({ privyUserId: response.user_id })
        if (!user) {
            throw new UserNotFoundException("User not found with privy user id: " + response.user_id)
        }
        // check if the fees are cached
        const cachedResult = await this.cacheManager.get<string>
        (
            createCacheKey(
                CacheKey.FeesResponse, 
                {
                    botId,
                    activePositionId,
                    userId: user.id,
                }
            )
        )
        // if the fees are cached, return them
        // if (cachedResult) {
        //     return this.superjson.parse<FeesV2ResponseData>(cachedResult)
        // }
        // check if the bot exists
        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(botId)
        if (!bot) {
            throw new BotNotFoundException("Bot not found")
        }
        // check if the bot is owned by the user
        if (bot.user.toString() !== user.id) {
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
        const feesResponse: FeesV2ResponseData = {
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
                    userId: user.id,
                }
            ),
            this.superjson.stringify(feesResponse),
            envConfig().cache.ttl.responses.fees,
        )
        return feesResponse
    }
}

