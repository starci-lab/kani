
import {
    Injectable,
    OnApplicationBootstrap
} from "@nestjs/common"
import {
    BotSchema,
    JobSchema,
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
    AsyncService
} from "@modules/mixin"
import {
    ClosePositionEnqueueService,
    OpenPositionEnqueueService,
    ReconcileBalanceEnqueueService,
    WithdrawEnqueueService
} from "@modules/blockchains"
import {
    InjectPrimaryMongoose
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    JobNotFoundException,
    LiquidityPoolNotFoundException
} from "@modules/exceptions"
import {
    JobContextService,
} from "./context"

/**
 * Service for requeueing open-position jobs when active jobs exceed TTL.
 *
 * @example
 * const requeueService = app.get(RequeueService)
 * await requeueService.process()
 */
@Injectable()
export class ActionRequeueService implements OnApplicationBootstrap {
    constructor(
        private readonly dayjsService: DayjsService,
        private readonly asyncService: AsyncService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly jobContextService: JobContextService,
        private readonly openPositionEnqueueService: OpenPositionEnqueueService,
        private readonly closePositionEnqueueService: ClosePositionEnqueueService,
        private readonly withdrawEnqueueService: WithdrawEnqueueService,
        private readonly reconcileBalanceEnqueueService: ReconcileBalanceEnqueueService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {
    }

    /**
     * On application bootstrap, process the requeue.
     */
    onApplicationBootstrap() {
        this.process()
    }
    /**
     * Requeues open-position jobs for bots whose active job exceeds TTL.
     *
     * @returns Promise that resolves when requeue pass completes.
     */
    async process() {
        // get TTL from config
        const ttl = envConfig().executor.runtime.operation.openPosition.requeue.interval
        // find bots with stale active jobs
        const bots = await this.connection.model<BotSchema>(
            BotSchema.name
        ).find({
            executor: {
                $eq: envConfig().executor.id,
            },
            activeJob: {
                $exists: true,
                $ne: null,
            },
            "activeJob.queuedAt": {
                $exists: true,
                $lt: this.dayjsService.now()
                    .subtract(
                        ttl,
                        "millisecond"
                    )
                    .toDate(),
            },
        })
        // requeue each stale bot
        const promises = bots.map(
            async (bot) => {
                const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
                    id: {
                        $eq: bot.activeJob?.liquidityPool.toString() ?? "",
                    }
                })
                if (!liquidityPool) {
                    throw new LiquidityPoolNotFoundException({
                        id: bot.activeJob?.liquidityPool.toString() ?? "",
                    })
                }
                const oldJob = await this.connection.model<JobSchema>(JobSchema.name).findById(bot.activeJob?.job)
                if (!oldJob) {
                    throw new JobNotFoundException(
                        {
                            jobId: bot.activeJob?.job.toString() ?? "",
                        }
                    )
                }
                switch (bot.activeJob?.jobType) {
                case JobType.OpenPosition: {
                    await this.openPositionEnqueueService.enqueue(
                        {
                            liquidityPool,
                            bot,
                            oldJob,
                            isRetry: true,
                        }
                    )
                    break
                }
                case JobType.ClosePosition: {
                    await this.closePositionEnqueueService.enqueue(
                        {
                            liquidityPool,
                            bot,
                            oldJob,
                            isRetry: true,
                        }
                    )
                    break
                }
                case JobType.Withdraw: {
                    await this.withdrawEnqueueService.enqueue(
                        {
                            bot,
                            oldJob,
                            isRetry: true,
                        }
                    )
                    break
                }
                case JobType.ReconcileBalance: {
                    await this.reconcileBalanceEnqueueService.enqueue(
                        {
                            bot,
                            oldJob,
                            isRetry: true,
                        }
                    )
                    break
                }
                }
            }
        )
        await this.asyncService.allIgnoreError(promises)
    }

    /**
     * Handle the interval for the requeue.
     */
    @Interval(envConfig().executor.runtime.operation.openPosition.requeue.interval)
    handleInterval() {
        this.process()
    }
}
