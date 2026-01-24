import {
    Injectable 
} from "@nestjs/common"
import {
    BotSchema, 
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    LockAuthorityService 
} from "../../bussiness"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    Types 
} from "mongoose"
import {
    OpenPositionOrchestratorService 
} from "@modules/blockchains"
import {
    ClmmPositionOpenRequestedEventPayload,
    DlmmPositionOpenRequestedEventPayload 
} from "@modules/event"
import {
    envConfig 
} from "@modules/env"
import {
    DayjsService 
} from "@modules/mixin"

@Injectable()
export class HandleOpenPositionService {
    /**
     * Runtime entrypoint for scheduling an "open position" job for a bot.
     *
     * This service is called by event adapters (CLMM/DLMM) when a liquidity pool signals
     * that a position should be opened.
     *
     * Responsibilities:
     * - Guard against invalid bot states (not running / already in position / already has active job)
     * - Acquire lock authority (single-writer) before enqueuing work
     * - Resolve the requested liquidity pool from memory storage
     * - Enqueue a BullMQ `OpenPosition` job via `OpenPositionOrchestratorService`
     * - Log enqueue success/failure and release lock on enqueue failure
     */
    constructor(
        private readonly openPositionOrchestratorService: OpenPositionOrchestratorService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly winstonService: WinstonService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly dayjsService: DayjsService,
    ) {}

    /**
     * Handles an open-position request for the given bot and event payload.
     *
     * Side effects:
     * - Acquires lock authority (Redis)
     * - Enqueues a BullMQ job
     * - Logs via Winston
     * - Releases lock authority if enqueue fails
     */
    async process(
        bot: BotSchema,
        event: ClmmPositionOpenRequestedEventPayload | DlmmPositionOpenRequestedEventPayload
    ) {
        // we do nothing if the bot is not running
        if (!bot.running) return
        // we do nothing if the bot has an active position
        if (bot.activePosition) return
        if (bot.activeJob) {
            return
        }
        if (!bot.balanceSnapshots) {
            return
        }
        const diffMs = this.dayjsService.now().diff(
            this.dayjsService.from(bot.balanceSnapshots.snapshotAt),
            "millisecond"
        )
        if (diffMs > envConfig().executor.runtime.operation.reconcileBalance.cooldown.rescan) {
            return
        }
        const jobId = new Types.ObjectId().toString()
        // check if the bot has an active job
        const acquired = await this.lockAuthorityService.acquire(
            {
                botId: bot.id,
            }
        )
        if (!acquired) return
        // enqueue the balance rebalancing
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne(
            {
                id: {
                    $eq: event.payload.id,
                }
            }
        )
        if (!liquidityPool) {
            return
        }
        try {
            const bullmqJob = await this.openPositionOrchestratorService.enqueue(
                {
                    bot,
                    jobId,
                    isRetry: false,
                    liquidityPool,
                }
            )
            this.winstonService.log(
                WinstonLog.OpenPositionEnqueued,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    jobId,
                    bullmqJobId: bullmqJob?.id,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.OpenPositionEnqueueFailed,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    error: error.message,
                }
            )
            this.lockAuthorityService.release(
                {
                    botId: bot.id,
                }
            )
        }
    }
}