import {
    Injectable, 
    OnApplicationBootstrap
} from "@nestjs/common"
import {
    ActiveJobSchema,
    JobType,
    PrimaryMemoryStorageService,
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
    OpenPositionOrchestratorService, LiquidityPoolStateService 
} from "@modules/blockchains/dexes"
import {
    BotsLoaderService 
} from "../../loaders"
import {
    LockAuthorityService 
} from "../../bussiness"

@Injectable()
export class RequeueService implements OnApplicationBootstrap {
    constructor(
        @InjectQueue(bullData[BullQueueName.OpenPosition].name)
        private readonly openPositionQueue: Queue<string>,
        private readonly dayjsService: DayjsService,
        private readonly winstonService: WinstonService,
        private readonly botsLoaderService: BotsLoaderService,
        private readonly asyncService: AsyncService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly openPositionOrchestratorService: OpenPositionOrchestratorService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
    ) {
    }

    onApplicationBootstrap() {
        this.process()
    }
    /**
     * Requeue the open position for the bots that have an active job and the queuedAt is older than the ttl
     */
    async process() {
        try {
            /**
             * Get the ttl for the requeue interval
             */
            const ttl = envConfig().executor.runtime.operation.openPosition.requeue.interval
            /**
             * Get the bots that have an active job and the queuedAt is older than the ttl
             */
            const bots = this.botsLoaderService.botCollection.chain().find(
                {
                    activeJob: {
                        $where: (activeJob: ActiveJobSchema) => {
                            return (
                                activeJob &&
                                activeJob.jobType === JobType.OpenPosition &&
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
                        $eq: undefined,
                    },
                }
            ).data()
            /**
             * Map the bots to the job ids
             */
            const promises = bots.map(
                async (bot) => {
                    const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
                        id: {
                            $eq: bot.activeJob?.liquidityPool?.toString() ?? "",
                        }
                    })
                    if (!liquidityPool) {
                        return
                    }
                    const bullmqJob = await this.openPositionQueue.getJob(bot.id)
                    if (bullmqJob) {
                    // we can add additional logic here
                        return
                    }
                    const acquired = await this.lockAuthorityService.acquire(
                        {
                            botId: bot.id,
                        }
                    )
                    if (!acquired) return
                    try {
                        const bullmqJob = await this.openPositionOrchestratorService.enqueue(
                            {
                                bot,
                                liquidityPool,
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                isRetry: true,
                                dynamicLiquidityPoolInfo: await this.liquidityPoolStateService.getDynamicLiquidityPoolInfo(liquidityPool),
                            }
                        )
                        this.winstonService.log(
                            WinstonLog.OpenPositionEnqueued,
                            {
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                botId: bot.id,
                                liquidityPoolId: liquidityPool.displayId,
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
            )
            await this.asyncService.allIgnoreError(promises)
        } catch (error) {
            this.winstonService.log(
                WinstonLog.OpenPositionRequeueFailed,
                {
                    error: error.message,
                }
            )
        }
    }

    @Interval(envConfig().executor.runtime.operation.openPosition.requeue.interval)
    handleInterval() {
        this.process()
    }


}