import { Injectable } from "@nestjs/common"
import {
    InjectPrimaryMongoose,
    BotSchema,
    PositionSchema,
    PrimaryMemoryStorageService,
    LiquidityPoolType
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
    InvalidPoolTokensException, 
    LiquidityPoolNotFoundException 
} from "@exceptions"
import { LiquidityPoolState, LiquidityPoolStateService } from "@modules/blockchains"

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
        if (liquidityPool.type === LiquidityPoolType.Clmm) {
            const state = await this.liquidityPoolStateService.getState(liquidityPool.displayId)
            return {
                tokenA: 0,
                tokenB: 0,
            }
        } else {
            return {
                tokenA: 0,
                tokenB: 0,
            }
        }
    }

    private async getClmmReserves(
        { state }: GetClmmReservesParams,
    ): Promise<ReservesResponseData> {
        const { dynamic } = state
        const { tickCurrent } = dynamic
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            token => token.id === state.static.tokenA.toString(),
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            token => token.id === state.static.tokenB.toString(),
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
    }

    private async getDlmmReserves(
        {
            botId,
            activePositionId,
        }: ReservesRequest,
    ): Promise<ReservesResponseData> {
        return {
            tokenA: 0,
            tokenB: 0,
        }
    }
}

export interface GetClmmReservesParams {
    state: LiquidityPoolState,
}