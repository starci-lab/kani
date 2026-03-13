import {
    Injectable,
} from "@nestjs/common"
import {
    HandleNotSyncedState 
} from "./types"
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
    InstanceService 
} from "@modules/mixin"
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

/**
 * Handle not synced service.
 *
 * @example
 * await handleNotSyncedService.process(bot)
 */
@Injectable()
export class HandleNotSyncedService {
    private readonly results: Map<string, HandleNotSyncedState> = new Map()
    constructor(
        private readonly dayjsService: DayjsService,
        private readonly rotationService: RotationService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly handleClosePositionService: HandleClosePositionService,
        private readonly handleOpenPositionService: HandleOpenPositionService,
        private readonly winstonService: WinstonService,
        private readonly instanceService: InstanceService,
    ) {}
 
    /**
     * Mark not synced as synced.
     *
     * @param ids - Array of liquidity pool ids
     */
    markSynced(
        ids: Array<string>
    ) {
        const snapshotAt = this.dayjsService.now()
        for (const id of ids) {
            this.results.set(
                id,
                {
                    snapshotAt,
                }
            )
        }
    }

    /**
     * Handle liquidity pools became ready event.
     *
     * @param payload - Liquidity pools became ready event payload
     */
    @OnEvent(EventName.LiquidityPoolsBecameReady)
    handleLiquidityPoolsBecameReady(
        { ids }: LiquidityPoolsBecameReadyEventPayload
    ) {
        // mark the liquidity pools as synced
        this.markSynced(ids)
        // log the liquidity pools became ready
        const liquidityPools = ids
            .map((id) => this.primaryMemoryStorageService.liquidityPoolMap.get(id))
            .filter((p): p is NonNullable<typeof p> => p != null)
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
    isSynced(id: string) {
        const result = this.results.get(id)
        // get the stale period
        const stale = envConfig().executor.diagnose.liquidityPoolsSynced.stale
        // if the result is not found, we check if the instance is created within the stale period
        if (!result) {
            const createdAt = this.instanceService.getCreatedAt()
            return this.dayjsService.now().diff(
                createdAt,
                "ms"
            ) <= stale
        }
        // if the result is found, we check if the snapshot is within the stale period
        const { snapshotAt } = result
        if (!snapshotAt) return false
        return this.dayjsService.now().diff(
            snapshotAt,
            "ms"
        ) <= stale
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
            if (this.isSynced(liquidityPool.id)) {
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
        if (bot.activePosition) {
            return
        }
        const botAssignment = this.rotationService.botAssignments.get(bot.id)
        if (!botAssignment) {
            return
        }
        // we filter the liquidity pools that are not synced
        const notSyncedPools = botAssignment.liquidityPoolIds.filter(id =>
            !this.isSynced(id)
        )
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