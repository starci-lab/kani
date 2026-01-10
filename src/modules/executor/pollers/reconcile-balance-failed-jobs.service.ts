import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { Connection, Types } from "mongoose"
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
import { FailedJobsPollerResult } from "./types"


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

    @Interval(envConfig().pollers.interval)
    async proccessFailedJobs() {
        const lookbackDate = this.dayjsService
            .now()
            .subtract(
                envConfig().pollers.failedJobs.lookbackDuration,
                "millisecond",
            )
            .toDate()

        const maxRetries = envConfig().pollers.failedJobs.maxRetries
        const results = await this.connection.model<JobSchema>(JobSchema.name).aggregate<FailedJobsPollerResult>([
            {
                $match: {
                    type: JobType.ReconcileBalance,
                    status: JobStatus.Failed,
                    executor: new Types.ObjectId(envConfig().botExecutor.executorId),
                    createdAt: { $gte: lookbackDate },
                    $or: [
                        { retryCount: { $exists: false } },
                        { retryCount: { $lt: maxRetries } },
                    ],
                },
            },
            // newest first
            { $sort: { createdAt: -1 } },
            // group by bot
            {
                $group: {
                    _id: "$bot",
                    latestJob: { $first: "$$ROOT" },
                    allJobIds: { $push: "$_id" },
                },
            },
            {
                $addFields: {
                    "latestJob.id": { $toString: "$latestJob._id" },
                },
            },
            // separate latest vs old jobs
            {
                $project: {
                    latestJob: 1,
                    deleteIds: {
                        $slice: ["$allJobIds", 1, { $size: "$allJobIds" }],
                    },
                },
            },
        ])
        
        if (results.length === 0) {
            return
        }


        // delete older jobs
        const deleteIds = results.flatMap(result => result.deleteIds)
        if (deleteIds.length > 0) {
            await this.connection.model<JobSchema>(JobSchema.name).deleteMany({ _id: { $in: deleteIds } })
        }

        // enqueue only latest jobs
        await this.asyncService.allIgnoreError(
            results.map(result => this.addToQueue(result.latestJob)),
        )
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
                leaseId: v4(),
            }
        )
        // log success
        this.logger.info(
            WinstonLog.ReconcileBalanceFailedJobsRecreated, {
                botId: bot.id,
                executorId: envConfig().botExecutor.executorId,
                jobId: job.id,
            }
        )
    }
}   
