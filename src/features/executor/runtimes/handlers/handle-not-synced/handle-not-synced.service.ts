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
    ) {}
 
    /**
     * Mark not synced as synced.
     *
     * @param ids - Array of liquidity pool ids
     */
    markSynced(
        ids: Array<string>
    ) {
        for (const id of ids) {
            this.results.set(
                id,
                {
                    snapshotAt: this.dayjsService.now(),
                }
            )
        }
    }

    /**
     * Check is synced.
     *
     * @param id - Liquidity pool id
     * @returns True if the liquidity pool is synced, false otherwise
     */
    isSynced(id: string) {
        const result = this.results.get(id)
        if (!result) return false
        const { snapshotAt } = result
        if (!snapshotAt) return false
        return this.dayjsService.now().diff(
            snapshotAt,
            "ms"
        ) <= envConfig().executor.diagnose.liquidityPoolsSynced.stale
    }
   
    /**
     * Process not synced. When a liquidity pool is not synced, we try to process a close position or a open position through the cached bot assignments.
     *
     * @param bot - Bot
     */
    async process(
        bot: BotSchema,
    ) {
        for (const liquidityPool of bot.liquidityPools) {
            // get not synced liquidity pools
            const synced = this.isSynced(liquidityPool.toString())
            if (synced) {
                continue
            }
            // we check the bot have a position
            if (bot.activePosition) {
                const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
                    id: {
                        $eq: bot.activePosition.liquidityPool.toString(),
                    },
                })
                if (!liquidityPool) {
                    continue
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
            // we check the bot assignments
            const botAssignment = this.rotationService.botAssignments.get(bot.id)
            if (!botAssignment) {
                continue
            }
            // we take a random bot liquidity pool
            const randomBotLiquidityPool = _.sample(botAssignment.liquidityPoolIds)
            if (!randomBotLiquidityPool) continue
            // we check the bot liquidity pool is valid
            const botLiquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
                id: {
                    $eq: randomBotLiquidityPool.toString(),
                },
            })
            if (!botLiquidityPool) continue
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
}