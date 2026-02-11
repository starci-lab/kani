import {
    Injectable, 
    OnApplicationBootstrap
} from "@nestjs/common"
import {
    JobType,
    PrimaryMemoryStorageService,
    PositionAssociateService,
    BotSchema,
    InjectPrimaryMongoose
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    DayjsService 
} from "@modules/mixin"
import {
    envConfig 
} from "@modules/env"
import {
    Interval 
} from "@nestjs/schedule"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    InjectQueue 
} from "@nestjs/bullmq"
import {
    Queue 
} from "bullmq"
import {
    BullQueueName, bullData 
} from "@modules/bullmq"
import {
    AsyncService 
} from "@modules/mixin"
import {
    ClosePositionEnqueueService, 
    LiquidityPoolStateService, 
    SettlementService
} from "@modules/blockchains"
import {
    LockAuthorityService 
} from "../../bussiness"
import {
    LiquidityPoolNotFoundException 
} from "@modules/exceptions"

/**
 * Service for requeueing close-position jobs when active jobs exceed TTL.
 *
 * @example
 * const requeueService = app.get(RequeueService)
 * await requeueService.process()
 */
@Injectable()
export class RequeueService implements OnApplicationBootstrap {
    constructor(
        @InjectQueue(bullData[BullQueueName.ClosePosition].name)
        private readonly closePositionQueue: Queue<string>,
        private readonly dayjsService: DayjsService,
        private readonly winstonService: WinstonService,
        private readonly asyncService: AsyncService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly closePositionEnqueueService: ClosePositionEnqueueService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly settlementService: SettlementService,
        private readonly positionAssociateService: PositionAssociateService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {
    }

    onApplicationBootstrap() {
        this.process()
    }
    /**
     * Requeues close-position jobs for bots whose active job exceeds TTL.
     *
     * @returns Promise that resolves when requeue pass completes.
     */
    async process() {
        try {
            // get TTL from config
            const ttl = envConfig().executor.runtime.operation.closePosition.requeue.interval
            // find bots with stale active jobs
            const bots = await this.connection.model<BotSchema>(BotSchema.name).find(
                {
                    executor: {
                        $eq: envConfig().executor.id,
                    },
                    activePosition: {
                        $exists: true,
                        $ne: null,
                    },
                    "activeJob.jobType": {
                        $eq: JobType.ClosePosition,
                    },
                    "activeJob.queuedAt": {
                        $exists: true,
                        $lt: this.dayjsService.now()
                            .subtract(ttl,
                                "millisecond")
                            .toDate(),
                    },
                }
            )
            // requeue each stale bot
            const promises = bots.map(
                async (bot) => {
                    await this.positionAssociateService.associateActivePosition({
                        bot 
                    })
                    const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
                        id: {
                            $eq: bot.activeJob?.liquidityPool?.toString() ?? "",
                        }
                    })
                    if (!liquidityPool) {
                        throw new LiquidityPoolNotFoundException({
                            id: bot.activeJob?.liquidityPool?.toString() ?? "",
                        })
                    }
                    const bullmqJob = await this.closePositionQueue.getJob(bot.id)
                    if (bullmqJob) {
                        // skip if job already in queue
                        this.winstonService.log(
                            WinstonLog.ClosePositionSkippedActiveJobFoundInQueue,
                            {
                                botId: bot.id,
                                liquidityPoolId: liquidityPool.displayId,
                            }
                        )
                        return
                    }
                    const state = await this.liquidityPoolStateService.getDynamicLiquidityPoolInfo(liquidityPool)
                    // check settlement status
                    const { settled, strategyResults } = await this.settlementService.settle(
                        {
                            bot,
                            liquidityPool,
                            state,
                        }
                    )
                    if (!settled && envConfig().executor.runtime.operation.closePosition.settle.enabled) {
                        this.winstonService.log(
                            WinstonLog.CannotSettlePosition,
                            {
                                botId: bot.id,
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                liquidityPoolId: liquidityPool.displayId,
                                strategyResults,
                            }
                        )
                        return
                    }
                    const acquired = await this.lockAuthorityService.acquire(
                        {
                            botId: bot.id,
                        }
                    )
                    if (!acquired) {
                        this.winstonService.log(
                            WinstonLog.ClosePositionLockAuthorityNotAcquired,
                            {
                                botId: bot.id,
                            }
                        )
                        return
                    }
                    try {
                        await this.closePositionEnqueueService.enqueue(
                            {
                                bot,
                                liquidityPool,
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                isRetry: true,
                                state,
                            }
                        )
                        this.winstonService.log(
                            WinstonLog.ClosePositionJobRequeued,
                            {
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                botId: bot.id,
                                liquidityPoolId: liquidityPool.displayId,
                            }
                        )
                    } catch (error) {
                        this.winstonService.log(
                            WinstonLog.ClosePositionJobRequeueFailed,
                            {
                                botId: bot.id,
                                liquidityPoolId: liquidityPool.displayId,
                                jobId: bot.activeJob?.job?.toString() ?? "",
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
            )
            await this.asyncService.allIgnoreError(promises)
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ClosePositionRequeueFailed,
                {
                    error: error.message,
                }
            )
        }
    }

    @Interval(envConfig().executor.runtime.operation.closePosition.requeue.interval)
    handleInterval() {
        this.process()
    }
}