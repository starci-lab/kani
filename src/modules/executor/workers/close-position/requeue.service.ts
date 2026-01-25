import {
    Injectable, 
    OnApplicationBootstrap
} from "@nestjs/common"
import {
    ActiveJobSchema,
    JobType,
    PrimaryMemoryStorageService,
    PositionAssociateService
} from "@modules/databases"
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
    ClosePositionOrchestratorService, LiquidityPoolStateService, SettlementService
} from "@modules/blockchains"
import {
    BotsLoaderService 
} from "../../loaders"
import {
    LockAuthorityService 
} from "../../bussiness"

@Injectable()
export class RequeueService implements OnApplicationBootstrap {
    constructor(
        @InjectQueue(bullData[BullQueueName.ClosePosition].name)
        private readonly closePositionQueue: Queue<string>,
        private readonly dayjsService: DayjsService,
        private readonly winstonService: WinstonService,
        private readonly botsLoaderService: BotsLoaderService,
        private readonly asyncService: AsyncService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly closePositionOrchestratorService: ClosePositionOrchestratorService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly settlementService: SettlementService,
        private readonly positionAssociateService: PositionAssociateService,
    ) {
    }

    onApplicationBootstrap() {
        this.process()
    }
    /**
     * Requeue the close-position job for bots whose `activeJob` is stale (queuedAt older than ttl).
     */
    async process() {
        try {
            /**
             * Get the ttl for the requeue interval
             */
            const ttl = envConfig().executor.runtime.operation.closePosition.requeue.interval
            /**
             * Get the bots that have an active job and the queuedAt is older than the ttl
             */
            const bots = this.botsLoaderService.botCollection.chain().find(
                {
                    activeJob: {
                        $where: (activeJob: ActiveJobSchema) => {
                            return (
                                activeJob &&
                                activeJob.jobType === JobType.ClosePosition &&
                                activeJob.queuedAt &&
                                this.dayjsService.now().diff(
                                    activeJob.queuedAt,
                                    "millisecond"
                                ) > ttl
                            )
                        }
                    },
                    running: {
                        $eq: true,
                    },
                    activePosition: {
                        $ne: null,
                    },
                }
            ).data()
            /**
             * Map the bots to the job ids
             */
            const promises = bots.map(
                async (bot) => {
                    await this.positionAssociateService.associateActivePosition(bot)
                    const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
                        id: {
                            $eq: bot.activeJob?.liquidityPool?.toString() ?? "",
                        }
                    })
                    if (!liquidityPool) {
                        return
                    }
                    const bullmqJob = await this.closePositionQueue.getJob(bot.id)
                    if (bullmqJob) {
                    // we can add additional logic here
                        return
                    }
                    const dynamicLiquidityPoolInfo = await this.liquidityPoolStateService.getDynamicLiquidityPoolInfo(liquidityPool)
                    // check settlement status
                    const { settled, strategyResults } = await this.settlementService.settle(
                        {
                            bot,
                            state: {
                                static: liquidityPool,
                                dynamic: dynamicLiquidityPoolInfo,
                            },
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
                    if (!acquired) return
                    try {
                        await this.closePositionOrchestratorService.enqueue(
                            {
                                bot,
                                liquidityPool,
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                isRetry: true,
                                dynamicLiquidityPoolInfo,
                            }
                        )
                        this.winstonService.log(
                            WinstonLog.ClosePositionEnqueued,
                            {
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                botId: bot.id,
                                liquidityPoolId: liquidityPool.displayId,
                            }
                        )
                    } catch (error) {
                        this.winstonService.log(
                            WinstonLog.ClosePositionEnqueueFailed,
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