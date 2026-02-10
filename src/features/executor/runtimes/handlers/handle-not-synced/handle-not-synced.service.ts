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
    BotSchema 
} from "@modules/databases"
import {
    envConfig 
} from "@modules/env"

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
     * Process not synced.
     *
     * @param bot - Bot
     */
    async process(
        bot: BotSchema,
    ) {
        const isNotSynced = false
        if (isNotSynced) {
            console.log(bot.id)
        }
        const syncMap: Record<string, boolean> = {
        }
        //const keyLength = this.results.size
        for (const key of this.results.keys()) {
            const isSynced = this.isSynced(key)
            syncMap[key] = isSynced
        }
    }
}