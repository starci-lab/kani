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
     * Process not synced.
     *
     * @param bot - Bot
     */
    async process(
        bot: BotSchema,
    ) {
        console.log(`sync bot ${bot.id}`)
    }
}