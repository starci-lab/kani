import {
    Injectable, 
    OnApplicationBootstrap
} from "@nestjs/common"
import {
    ActiveJobSchema,
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
    BalanceService 
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
        @InjectQueue(bullData[BullQueueName.ReconcileBalance].name)
        private readonly reconcileBalanceQueue: Queue<string>,
        private readonly dayjsService: DayjsService,
        private readonly winstonService: WinstonService,
        private readonly botsLoaderService: BotsLoaderService,
        private readonly asyncService: AsyncService,
        private readonly balanceService: BalanceService,
        private readonly lockAuthorityService: LockAuthorityService,
    ) {
    }

    onApplicationBootstrap() {
        this.process()
    }
    /**
     * Requeue the balance rebalancing for the bots that have an active job and the queuedAt is older than the ttl
     */
    async process() {
        try {
            /**
             * Get the ttl for the requeue interval
             */
            const ttl = envConfig().executor.runtime.operation.reconcileBalance.requeue.interval
            /**
             * Get the bots that have an active job and the queuedAt is older than the ttl
             */
            const bots = this.botsLoaderService.botCollection.chain().find(
                {
                    activeJob: {
                        $where: (activeJob: ActiveJobSchema) => {
                            return (
                                activeJob &&
                                activeJob.queuedAt &&
                                this.dayjsService.now().diff(
                                    activeJob.queuedAt,
                                    "millisecond"
                                ) > ttl
                            )
                        }
                    }
                }
            ).data()
            /**
             * Map the bots to the job ids
             */
            const promises = bots.map(
                async (bot) => {
                    const bullmqJob = await this.reconcileBalanceQueue.getJob(bot.id)
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
                        const bullmqJob = await this.balanceService.enqueue(
                            {
                                bot,
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                isRetry: true,
                            }
                        )
                        this.winstonService.log(
                            WinstonLog.ReconcileBalanceEnqueued,
                            {
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                botId: bot.id,
                                bullmqJobId: bullmqJob?.id,
                            }
                        )
                    } catch (error) {
                        this.winstonService.log(
                            WinstonLog.ReconcileBalanceEnqueueFailed,
                            {
                                botId: bot.id,
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
                WinstonLog.ReconcileBalanceRequeueFailed,
                {
                    error: error.message,
                }
            )
        }
    }

    @Interval(envConfig().executor.runtime.operation.reconcileBalance.requeue.interval)
    handleInterval() {
        this.process()
    }


}