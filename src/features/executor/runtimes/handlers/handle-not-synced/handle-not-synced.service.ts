import {
    Injectable,
} from "@nestjs/common"
import {
    DayjsService 
} from "@modules/mixin"
import {
    BotSchema,
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    envConfig 
} from "@modules/env"
import {
    RotationService 
} from "../../../bussiness"
import _ from "lodash"
import {
    HandleClosePositionService 
} from "../handle-close-position"
import {
    HandleOpenPositionService 
} from "../handle-open-position"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    LiquidityPoolNotFoundException 
} from "@modules/exceptions"
import {
    EventName, 
    LiquidityPoolsBecameReadyEventPayload
} from "@modules/event"
import {
    OnEvent 
} from "@nestjs/event-emitter"
import {
    LiquidityPoolsSyncedDiagnosticReadinessCacheService 
} from "@modules/cache"

/**
 * Handle not synced service.
 *
 * @example
 * await handleNotSyncedService.process(bot)
 */
@Injectable()
export class HandleNotSyncedService {
    constructor(
        private readonly dayjsService: DayjsService,
        private readonly rotationService: RotationService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly handleClosePositionService: HandleClosePositionService,
        private readonly handleOpenPositionService: HandleOpenPositionService,
        private readonly winstonService: WinstonService,
        private readonly liquidityPoolsSyncedDiagnosticReadinessCacheService: LiquidityPoolsSyncedDiagnosticReadinessCacheService,
    ) {}
 
    /**
     * Mark not synced as synced.
     *
     * @param ids - Array of liquidity pool ids
     */
    async markSynced(
        ids: Array<string>
    ) {
        await this.liquidityPoolsSyncedDiagnosticReadinessCacheService.setMany(ids)
    }

    /**
     * Handle liquidity pools became ready event.
     *
     * @param payload - Liquidity pools became ready event payload
     */
    @OnEvent(EventName.LiquidityPoolsBecameReady)
    async handleLiquidityPoolsBecameReady(
        { ids }: LiquidityPoolsBecameReadyEventPayload
    ) {
        // mark the liquidity pools as synced
        await this.markSynced(ids)
        // log the liquidity pools became ready
        const liquidityPools = ids
            .map((id) => this.primaryMemoryStorageService.liquidityPoolMap.get(id))
            .filter(
                (liquidityPool): liquidityPool is NonNullable<typeof liquidityPool> => liquidityPool != null
            )
        if (!liquidityPools) {
            return
        }
        // log the liquidity pools synced
        this.winstonService.log(
            WinstonLog.LiquidityPoolsSyncedMarkedAsReady,
            {
                displayIds: liquidityPools.map(pool => pool.displayId),
            }
        )
    }

    /**
     * Check is synced.
     *
     * @param id - Liquidity pool id
     * @returns True if the liquidity pool is synced, false otherwise
     */
    async isSynced(id: string) {
        const cache = await this.liquidityPoolsSyncedDiagnosticReadinessCacheService.get()
        const result = cache.results[id]
        if (!result) return false
        return this.dayjsService.now().diff(
            result.snapshotAt,
            "ms"
        ) <= envConfig().diagnostics.dynamicLiquidityPoolInfo.staleMs
    }

    /**
     * Check if many liquidity pools are synced.
     *
     * @param ids - Array of liquidity pool ids
     * @returns True if the liquidity pools are synced, false otherwise
     */
    async isSyncedMany(ids: Array<string>) {
        const cache = await this.liquidityPoolsSyncedDiagnosticReadinessCacheService.get()
        return ids.map(id => {
            const result = cache.results[id]
            if (!result) return {
                id, isSynced: false 
            }
            return {
                id,
                isSynced: this.dayjsService.now().diff(
                    result.snapshotAt,
                    "ms"
                ) <= envConfig().diagnostics.dynamicLiquidityPoolInfo.staleMs
            }
        })
    }
   
    /**
     * Process not synced. When a liquidity pool is not synced, we try to process a close position or a open position through the cached bot assignments.
     *
     * @param bot - Bot
     */
    async process(
        bot: BotSchema,
    ) {
        // return if bot is not running
        if (!bot.running) return
        // return if bot has an active job
        if (bot.activeJob) return
        // we check the bot have a position
        if (bot.activePosition) {
            const liquidityPool = this.primaryMemoryStorageService.liquidityPoolMap.get(bot.activePosition.liquidityPool.toString())
            // check the liquidity pool is valid
            if (!liquidityPool) {
                throw new LiquidityPoolNotFoundException({
                    id: bot.activePosition.liquidityPool.toString(),
                })
            }
            // check the liquidity pool is not synced
            if (await this.isSynced(liquidityPool.id)) {
                return
            }
            this.winstonService.log(
                WinstonLog.NotSyncedProcessClosePosition,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            // we try to process a close position
            this.handleClosePositionService.process(
                {
                    bot,
                    liquidityPool,
                }
            )
            return
        }   
        const botAssignment = this.rotationService.botAssignments.get(bot.id)
        if (!botAssignment) {
            return
        }
        // we filter the liquidity pools that are not synced
        const notSyncedPools = (
            await this.isSyncedMany(botAssignment.liquidityPoolIds
            )
        )
            .filter(liquidityPool => !liquidityPool.isSynced)
        // if there are no not synced liquidity pools, we return
        if (notSyncedPools.length === 0) return   
        // we take a random synced liquidity pool
        const botLiquidityPoolId = _.sample(notSyncedPools)
        if (!botLiquidityPoolId) return
        // we check the bot liquidity pool is valid
        const botLiquidityPool = this.primaryMemoryStorageService.liquidityPoolMap.get(botLiquidityPoolId.toString())
        if (!botLiquidityPool) return
        this.winstonService.log(
            WinstonLog.NotSyncedProcessOpenPosition,
            {
                botId: bot.id,
                liquidityPoolId: botLiquidityPool.displayId,
            }
        )
        // we try to process a open position
        this.handleOpenPositionService.process(
            {
                bot,
                liquidityPool: botLiquidityPool,
            }
        )
    }
}