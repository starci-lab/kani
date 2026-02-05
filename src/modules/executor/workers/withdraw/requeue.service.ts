import {
    Injectable, 
    OnApplicationBootstrap
} from "@nestjs/common"
import {
    ActiveJobSchema,
    JobType,
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
    WithdrawEnqueueService 
} from "@modules/blockchains/balance"
import {
    BotsLoaderService 
} from "../../loaders"
import {
    LockAuthorityService    
} from "../../bussiness"

@Injectable()
export class RequeueService implements OnApplicationBootstrap {
    constructor(
        @InjectQueue(bullData[BullQueueName.Withdraw].name)
        private readonly withdrawQueue: Queue<string>,
        private readonly dayjsService: DayjsService,
        private readonly winstonService: WinstonService,
        private readonly botsLoaderService: BotsLoaderService,
        private readonly asyncService: AsyncService,
        private readonly withdrawEnqueueService: WithdrawEnqueueService,
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
            const ttl = envConfig().executor.runtime.operation.withdraw.requeue.interval
            /**
             * Get the bots that have an active job and the queuedAt is older than the ttl
             */
            const bots = this.botsLoaderService.botCollection.chain().find(
                {
                    activeJob: {
                        $where: (activeJob: ActiveJobSchema) => {
                            return (
                                activeJob &&
                                activeJob.jobType === JobType.Withdraw &&
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
                    const bullmqJob = await this.withdrawQueue.getJob(bot.id)
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
                        const bullmqJob = await this.withdrawEnqueueService.enqueue(
                            {
                                bot,
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                isRetry: true,
                            }
                        )
                        this.winstonService.log(
                            WinstonLog.WithdrawJobRequeued,
                            {
                                jobId: bot.activeJob?.job?.toString() ?? "",
                                botId: bot.id,
                                bullmqJobId: bullmqJob?.id,
                            }
                        )
                    } catch (error) {
                        this.winstonService.log(
                            WinstonLog.WithdrawJobRequeueFailed,
                            {
                                botId: bot.id,
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
                WinstonLog.WithdrawRequeueFailed,
                {
                    error: error.message,
                }
            )
        }
    }

    @Interval(envConfig().executor.runtime.operation.withdraw.requeue.interval)
    handleInterval() {
        this.process()
    }


}