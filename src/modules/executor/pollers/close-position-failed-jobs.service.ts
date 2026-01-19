import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { Connection, Types } from "mongoose"
import { Interval } from "@nestjs/schedule"
import { 
    JobStatus, 
    JobSchema, 
    InjectPrimaryMongoose, 
    JobType, 
    BotSchema, 
    PrimaryMemoryStorageService, 
    LiquidityPoolType 
} from "@modules/databases"
import { envConfig } from "@modules/env"
import { AsyncService, DayjsService } from "@modules/mixin"
import { InjectQueue } from "@nestjs/bullmq"
import { bullData, BullQueueName } from "@modules/bullmq"
import { Queue } from "bullmq"
import { DlmmLiquidityPoolState, LiquidityPoolState, ClosePositionPayload } from "@modules/blockchains"
import { v4 } from "uuid"
import { BotNotFoundException, LiquidityPoolNotFoundException } from "@modules/exceptions"
import { LiquidityPoolStateService } from "@modules/blockchains"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"
import { FailedJobsPollerResult } from "./types"

@Injectable()
export class ClosePositionFailedJobsPollerService implements OnApplicationBootstrap {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        @InjectQueue(bullData[BullQueueName.ClosePosition].name)
        private readonly closePositionQueue: Queue<ClosePositionPayload>,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
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
                    type: JobType.ClosePosition,
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

            // group by bot (or user)
            {
                $group: {
                    _id: "$bot",
                    latestJob: { $first: "$$ROOT" },
                    allJobIds: { $push: "$_id" },
                },
            },
            // add id to latest job
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
        const liquidityPool = this.primaryMemoryStorageService
            .liquidityPools.find(liquidityPool => liquidityPool.id === job.liquidityPool?.toString())
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException("Liquidity pool not found")
        }
        let state: LiquidityPoolState | DlmmLiquidityPoolState
        if (liquidityPool.type === LiquidityPoolType.Dlmm) {
            state = await this.liquidityPoolStateService.getDlmmState(liquidityPool.displayId)
        } else {
            state = await this.liquidityPoolStateService.getState(liquidityPool.displayId)
        }
        // add job to queue
        await this.closePositionQueue.add(
            v4(), {
                jobId: job.id,
                bot,
                state: this.superjson.stringify(state),
                leaseId: v4(),
            }
        )
        // log success
        this.logger.info(WinstonLog.ClosePositionFailedJobsRecreated, {
            botId: bot.id,
            executorId: envConfig().botExecutor.executorId,
            jobId: job.id,
        })
    }
}   
