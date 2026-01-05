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
        }: ReservesRequest,
        userLike: UserJwtLike,
    ): Promise<ReservesResponseData> {
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findOne({
            user: userLike.id,
            _id: botId,
        })
        if (!bot) {
            throw new BotNotFoundException(botId)
        }
        const activePosition = await this.connection.model<PositionSchema>(PositionSchema.name)
            .findOne({
                bot: bot.id,
                isActive: true,
            })
        if (!activePosition) {
            throw new ActivePositionNotFoundException("Active position not found")
        }
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
