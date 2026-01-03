import { Injectable, OnApplicationBootstrap } from "@nestjs/common"
import { Connection } from "mongoose"
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
import { DlmmLiquidityPoolState, LiquidityPoolState, OpenPositionPayload } from "@modules/blockchains"
import { v4 } from "uuid"
import { BotNotFoundException, LiquidityPoolNotFoundException } from "@exceptions"
import { LiquidityPoolStateService } from "@modules/blockchains"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { InjectWinston, WinstonLog } from "@modules/winston"
import { Logger as WinstonLogger } from "winston"


@Injectable()
export class OpenPositionFailedJobsPollerService implements OnApplicationBootstrap {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly dayjsService: DayjsService,
        @InjectQueue(bullData[BullQueueName.OpenPosition].name)
        private readonly openPositionQueue: Queue<OpenPositionPayload>,
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

    @Interval(envConfig().poller.interval)
    async proccessFailedJobs() {
        const failedJobs = await this.connection.model<JobSchema>(JobSchema.name)
            .find(
                {
                    type: JobType.OpenPosition,
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
        if (failedJobs.length === 0) {
            return
        }
        await this.asyncService.allIgnoreError(failedJobs.map(job => this.addToQueue(job)))
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
        await this.openPositionQueue.add(
            v4(), {
                jobId: job.id,
                bot,
                state: this.superjson.stringify(state),
            }
        )
        // log success
        this.logger.info(WinstonLog.OpenPositionFailedJobsRecreated, {
            botId: bot.id,
            executorId: envConfig().botExecutor.executorId,
            jobId: job.id,
        })
    }
}   