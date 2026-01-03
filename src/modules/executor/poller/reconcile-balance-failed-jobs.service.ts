import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { Connection } from "mongoose"
import { Interval } from "@nestjs/schedule"
import { 
    JobStatus, 
    JobSchema, 
    InjectPrimaryMongoose, 
    JobType, 
    BotSchema
} from "@modules/databases"
import { envConfig } from "@modules/env"
import { AsyncService, DayjsService } from "@modules/mixin"
import { InjectQueue } from "@nestjs/bullmq"
import { bullData, BullQueueName } from "@modules/bullmq"
import { Queue } from "bullmq"
import { ReconcileBalancePayload } from "@modules/blockchains"
import { v4 } from "uuid"
import { BotNotFoundException } from "@exceptions"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"


@Injectable()
export class ReconcileBalanceFailedJobsPollerService implements OnApplicationBootstrap {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        @InjectQueue(bullData[BullQueueName.ReconcileBalance].name)
        private readonly reconcileBalanceQueue: Queue<ReconcileBalancePayload>,
        private readonly asyncService: AsyncService,
        @InjectWinston()
        private readonly logger: WinstonLogger,
    ) {}

    onApplicationBootstrap() {
        this.proccessFailedJobs()
    }

    @Interval(envConfig().poller.interval)
    async proccessFailedJobs() {
        const failedJobs = await this.connection.model<JobSchema>(JobSchema.name)
            .find(
                {
                    type: JobType.ReconcileBalance,
                    status: JobStatus.Failed,
                    executor: envConfig().botExecutor.executorId,
                    createdAt: {
                        $gte: this.dayjsService.now().subtract(
                            envConfig().poller.failedJobs.lookbackDuration, 
                            "millisecond"
                        ).toDate(),
                    },
                    $or: [
                        { retryCount: { $exists: false } },
                        { retryCount: { $lt: envConfig().poller.failedJobs.maxRetries } },
                    ],
                }
            )
            .exec()
        await this.asyncService.allIgnoreError(failedJobs.map(job => this.addToQueue(job)))
    }

    private async addToQueue(job: JobSchema) {
        const bot = await this.connection.model<BotSchema>(BotSchema.name).findById(job.bot)
        if (!bot) {
            throw new BotNotFoundException("Bot not found")
        }
        // add job to queue
        await this.reconcileBalanceQueue.add(
            v4(), {
                jobId: job.id,
                bot,
            }
        )
        // log success
        this.logger.info(
            WinstonLog.ReconcileBalanceFailedJobsRecreated, {
                botId: bot.id,
                executorId: envConfig().botExecutor.executorId,
                jobId: job.id,
            })
    }
}   
