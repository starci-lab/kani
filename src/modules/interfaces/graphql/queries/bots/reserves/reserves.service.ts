import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    PositionSchema,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import { Connection } from "mongoose"
import {
    ReservesRequest,
    ReservesResponseData,
} from "./reserves.dto"
import { UserJwtLike } from "@modules/passport"
import { InjectRedisCache } from "@modules/cache"
import { Cache } from "cache-manager"
import { InjectSuperJson, DayjsService } from "@modules/mixin"
import SuperJSON from "superjson"
import { 
    ActivePositionNotFoundException, 
    BotNotFoundException, 
    BotNotOwnedByUserException, 
    LiquidityPoolNotFoundException 
} from "@exceptions"
import { LiquidityPoolStateService } from "@modules/blockchains"
import { ReservesOrchestratorService } from "@modules/blockchains/dexes"

@Injectable()
export class ReservesService {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly dayjsService: DayjsService,
        @InjectRedisCache()
        private readonly cacheManager: Cache,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly reservesOrchestratorService: ReservesOrchestratorService,
    ) { }

    async reserves(
        {
            botId,
            activePositionId,
        }: ReservesRequest,
        userLike: UserJwtLike,
    ): Promise<ReservesResponseData> {
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(botId)
        if (!bot) {
            throw new BotNotFoundException(`Bot not found with id: ${botId}`)
        }
        // check if the bot is owned by the user
        if (bot.user.toString() !== userLike.id) {
            throw new BotNotOwnedByUserException(`Bot not owned by user with id: ${userLike.id}`)
        }
        // check if the active position exists and is owned by the bot
        const activePosition = await this.connection.model<PositionSchema>(PositionSchema.name).findById(activePositionId)
        if (
            !activePosition 
            || activePosition.bot.toString() !== botId
            || !activePosition.isActive
        ) {
            throw new ActivePositionNotFoundException("Active position not found")
        }
        bot.activePosition = activePosition
        // retrieve the liquidity pool
        const liquidityPool = this.primaryMemoryStorageService.liquidityPools.find(
            liquidityPool => liquidityPool.id === activePosition.liquidityPool.toString(),
        )
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException("Liquidity pool not found")
        }
        const reserves = await this.reservesOrchestratorService.reserves({
            bot,
            liquidityPoolId: liquidityPool.displayId,
        })
        return {
            tokenA: reserves.tokenA.toNumber(),
            tokenB: reserves.tokenB.toNumber(),
        }
    }
}
