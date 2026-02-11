import {
    Injectable 
} from "@nestjs/common"
import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    LockAuthorityService 
} from "../../../bussiness"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    Types 
} from "mongoose"
import {
    EvalSnapshotService,
    OpenPositionEnqueueService 
} from "@modules/blockchains"
import {
    envConfig 
} from "@modules/env"
import {
    DayjsService, AsyncService 
} from "@modules/mixin"
import {
    PriceDiagnosticService,
    DynamicLiquidityPoolInfoDiagnosticService,
} from "../../../bussiness"  
import {
    DynamicLiquidityPoolInfoDiagnosticNotReadyException,
    PriceDiagnosticNotReadyException,
    TokenNotFoundException
} from "@modules/exceptions"
import {
    WaitService
} from "@modules/mixin"
import {
    InjectQueue
} from "@nestjs/bullmq"
import {
    bullData, BullQueueName
} from "@modules/bullmq"
import {
    Queue
} from "bullmq"
import type {
    HandleOpenPositionParams,
} from "./types"

/**
 * Runtime service for scheduling open-position jobs.
 *
 * @example
 * await handleOpenPositionService.process({ bot, liquidityPool, eventPayload })
 */
@Injectable()
export class HandleOpenPositionService {
    constructor(
        private readonly openPositionEnqueueService: OpenPositionEnqueueService,
        private readonly lockAuthorityService: LockAuthorityService,
        private readonly winstonService: WinstonService,
        private readonly dayjsService: DayjsService,
        private readonly dynamicLiquidityPoolInfoDiagnosticService: DynamicLiquidityPoolInfoDiagnosticService,
        private readonly priceDiagnosticService: PriceDiagnosticService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly asyncService: AsyncService,
        private readonly waitService: WaitService,
        @InjectQueue(bullData[BullQueueName.OpenPosition].name)
        private readonly openPositionQueue: Queue<string>,
        private readonly evalSnapshotService: EvalSnapshotService,
    ) {}

    /**
     * Process open-position request for the given bot and liquidity pool.
     *
     * @param params - Handle open position params (bot, liquidityPool, eventPayload)
     * @returns void
     *
     * @example
     * await handleOpenPositionService.process({ bot, liquidityPool, eventPayload })
     */
    async process(
        {
            bot,
            liquidityPool,
            eventPayload,
        }: HandleOpenPositionParams
    ) {
        // Skip if bot is not running
        if (!bot.running) {
            this.winstonService.log(
                WinstonLog.OpenPositionSkippedBotNotRunning,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return
        }
        // Skip if bot already has an active position
        if (bot.activePosition) {
            this.winstonService.log(
                WinstonLog.OpenPositionSkippedBotAlreadyHasActivePosition,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return
        }
        // Skip if bot already has an active job
        if (bot.activeJob) {
            this.winstonService.log(
                WinstonLog.OpenPositionSkippedBotAlreadyHasActiveJob,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return
        }
        // Skip if no balance snapshot (need reconciled balance before opening)
        if (!bot.balanceSnapshots) {
            return
        }
        const { eligible } = await this.evalSnapshotService.eval(
            {
                bot,
            }
        )
        if (!eligible) {
            this.winstonService.log(
                WinstonLog.OpenPositionSkippedNotEligible,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return
        }
        // Skip if balance snapshot is too old (outside rescan cooldown)
        const diffMs = this.dayjsService.now().diff(
            this.dayjsService.from(bot.balanceSnapshots.snapshotAt),
            "millisecond"
        )
        if (diffMs > envConfig().executor.runtime.operation.reconcileBalance.cooldown.rescan) {
            this.winstonService.log(
                WinstonLog.OpenPositionSkippedBalanceSnapshotTooOld,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return
        }
        try {
            await this.asyncService.allMustDone([
                (
                    async () => {
                        if (!await this.dynamicLiquidityPoolInfoDiagnosticService.ready(liquidityPool.id)) {
                            this.winstonService.log(
                                WinstonLog.OpenPositionSkippedDynamicLiquidityPoolInfoNotReady,
                                {
                                    botId: bot.id,
                                    liquidityPoolId: liquidityPool.displayId,
                                }
                            )
                            throw new DynamicLiquidityPoolInfoDiagnosticNotReadyException(
                                {
                                    liquidityPoolId: liquidityPool.displayId,
                                }
                            )
                        }
                    }
                )(),
                (
                    async () => {
                        if (!await this.priceDiagnosticService.ready(liquidityPool.tokenA.toString())) {
                            const token = this.primaryMemoryStorageService.tokenCollection.findOne({
                                id: {
                                    $eq: liquidityPool.tokenA.toString(),
                                },
                            })
                            if (!token) {
                                throw new TokenNotFoundException({
                                    id: liquidityPool.tokenA.toString(),
                                })
                            }
                            this.winstonService.log(
                                WinstonLog.OpenPositionSkippedPriceNotReady,
                                {
                                    botId: bot.id,
                                    liquidityPoolId: liquidityPool.displayId,
                                    tokenId: token.displayId,
                                }
                            )
                            throw new PriceDiagnosticNotReadyException({
                                tokenId: token.displayId,
                            })
                        }
                    }
                )(),
                (
                    async () => {
                        if (!await this.priceDiagnosticService.ready(liquidityPool.tokenB.toString())) {
                            const token = this.primaryMemoryStorageService.tokenCollection.findOne({
                                id: {
                                    $eq: liquidityPool.tokenB.toString(),
                                },
                            })
                            if (!token) {
                                throw new TokenNotFoundException({
                                    id: liquidityPool.tokenB.toString(),
                                })
                            }
                            this.winstonService.log(
                                WinstonLog.OpenPositionSkippedPriceNotReady,
                                {
                                    botId: bot.id,
                                    liquidityPoolId: liquidityPool.displayId,
                                    tokenId: token.displayId,
                                }
                            )
                            throw new PriceDiagnosticNotReadyException(
                                {
                                    tokenId: token.displayId,
                                }
                            )
                        }
                    }
                )(),
            ])
        } catch {
            return
        }
        // Wait to ensure no job for this bot is already in the queue
        const noActiveJobFound = await this.waitService.wait(
            {
                action: async () => {
                    const job = await this.openPositionQueue.getJob(bot.id)
                    return !job
                }
            }
        )
        if (!noActiveJobFound) return
        // Acquire lock authority; return if not acquired
        const acquired = await this.lockAuthorityService.acquire(
            {
                botId: bot.id,
            }
        )
        if (!acquired) return
        const jobId = new Types.ObjectId().toString()
        // Enqueue the open-position job
        try {
            const bullmqJob = await this.openPositionEnqueueService.enqueue(
                {
                    bot,
                    jobId,
                    isRetry: false,
                    liquidityPool,
                    state: eventPayload,
                }
            )
            this.winstonService.log(
                WinstonLog.OpenPositionJobEnqueued,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    jobId,
                    bullmqJobId: bullmqJob?.id,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.OpenPositionJobEnqueueFailed,
                {
                    botId: bot.id,
                    liquidityPoolId: liquidityPool.displayId,
                    jobId,
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
}