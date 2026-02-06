/**
 * Close Position Worker
 *
 * BullMQ worker (thin orchestrator) for the `close-position` queue.
 *
 * This worker is intentionally thin:
 * - loads Bot + Job documents
 * - resolves liquidity pool + latest pool state
 * - builds a shared `ProcessParams`
 * - runs phase services in order (idempotent on retries)
 *
 * Phases (services):
 * PREPARE → HEARTBEAT → EXECUTE → HEARTBEAT → CONFIRM → HEARTBEAT → COMPLETED
 *
 * On any error: delegates to FAILED phase (classifies + logs) and rethrows.
 */

import {
    LiquidityPoolStateService,
    ClosePositionPayload,
} from "@modules/blockchains"
import {
    BotSchema,
    InjectPrimaryMongoose,
    JobSchema,
    PrimaryMemoryStorageService,
    PositionAssociateService,
} from "@modules/databases"
import {
    BotNotFoundException,
    JobNotFoundException,
    LiquidityPoolNotFoundException,
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    Job,
    UnrecoverableError,
} from "bullmq"
import {
    Connection,
} from "mongoose"
import {
    Processor as Worker,
    WorkerHost,
} from "@nestjs/bullmq"
import {
    BullQueueName,
    bullData,
} from "@modules/bullmq"
import {
    envConfig,
} from "@modules/env"
import {
    InjectSuperJson,
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    PrepareService,
} from "./prepare.service"
import {
    SendHeartbeatService,
} from "./send-heartbeat.service"
import {
    OnCompletedService,
} from "./on-completed.service"
import {
    OnFailedService,
} from "./on-failed.service"
import {
    ClearService,
} from "./clear.service"
import {
    ProcessParams,
} from "./types"
import {
    ExecuteService,
} from "./execute.service"
import {
    TokenType,
} from "@modules/typedefs"
import {
    ConfirmService,
} from "./confirm.service"
import {
    AsyncService,
} from "@modules/mixin"
import {
    OnEvent 
} from "@nestjs/event-emitter"
import {
    EventName, LockAuthorityTimeoutEventPayload 
} from "@modules/event"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"

@Worker(
    bullData[BullQueueName.ClosePosition].name,
    {
        concurrency: envConfig().bullmq.concurrency,
        lockDuration: envConfig().bullmq.lockDuration,
        stalledInterval: envConfig().bullmq.stalledInterval,
        maxStalledCount: envConfig().bullmq.maxStalledCount,
    }
)
export class ClosePositionWorker extends WorkerHost {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly prepareService: PrepareService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly executeService: ExecuteService,
        private readonly confirmService: ConfirmService,
        private readonly onCompletedService: OnCompletedService,
        private readonly onFailedService: OnFailedService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly clearService: ClearService,
        private readonly asyncService: AsyncService,
        private readonly positionAssociateService: PositionAssociateService,
        private readonly winstonService: WinstonService,
    ) {
        super()
    }

    @OnEvent(EventName.LockAuthorityTimeout)
    async onLockAuthorityReleased(
        payload: LockAuthorityTimeoutEventPayload
    ) {
        this.winstonService.log(
            WinstonLog.ClosePositionLockAuthorityReleased,
            {
                botId: payload.botId,
            }
        )
    }

    async process(bullmqJob: Job<string>): Promise<void> {
        // Payload is stored as SuperJSON string (same convention as open-position).
        const payload = this.superJson.parse<ClosePositionPayload>(bullmqJob.data)
        const { botId, jobId, liquidityPoolId, dynamicLiquidityPoolInfo } = payload

        const [result,
            error] = await this.asyncService.resolveTuple(
            (async () => {
                const bot = await this.connection
                    .model<BotSchema>(BotSchema.name)
                    .findById(botId)
                if (!bot) {
                    throw new UnrecoverableError(
                        new BotNotFoundException({
                            id: botId,
                        }).toJSON()
                    )
                }
                // associate the active position
                await this.positionAssociateService.associateActivePosition({ bot })
                // get the job
                const job = await this.connection
                    .model<JobSchema>(JobSchema.name)
                    .findById(jobId)

                if (!job) {
                    throw new UnrecoverableError(
                        new JobNotFoundException({
                            jobId 
                        }).toJSON()
                    )
                }

                const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
                    id: {
                        $eq: liquidityPoolId,
                    }
                })

                if (!liquidityPool) {
                    throw new UnrecoverableError(
                        new LiquidityPoolNotFoundException({
                            id: liquidityPoolId 
                        }).toJSON()
                    )
                }

                const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                    id: {
                        $eq: bot.targetToken.toString(),
                    }
                })
                if (!targetToken) {
                    throw new TokenNotFoundException({
                        id: bot.targetToken.toString() 
                    })
                }

                const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                    id: {
                        $eq: bot.quoteToken.toString(),
                    }
                })
                if (!quoteToken) {
                    throw new TokenNotFoundException({
                        id: bot.quoteToken.toString() 
                    })
                }

                const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                    type: {
                        $eq: TokenType.Native
                    },
                    chainId: {
                        $eq: bot.chainId
                    }
                })
                if (!gasToken) {
                    throw new TokenNotFoundException({
                        conditions: {
                            type: TokenType.Native,
                            chainId: bot.chainId
                        }
                    })
                }

                return {
                    bot, job, liquidityPool, dynamicLiquidityPoolInfo, targetToken, quoteToken, gasToken 
                }
            })()
        )

        if (error) {
            await this.clearService.process({
                botId: payload.botId,
                jobId: payload.jobId,
            })
            return
        }
        const { bot, job, liquidityPool, targetToken, quoteToken, gasToken } = result
        const baseParams: ProcessParams = {
            bullmqJob,
            bot,
            job,
            payload,
            liquidityPool,
            dynamicLiquidityPoolInfo: dynamicLiquidityPoolInfo ?? await this.liquidityPoolStateService.getDynamicLiquidityPoolInfo(liquidityPool),
            targetToken,
            quoteToken,
            gasToken,
        }
        try {
            const { result: prepareResult } = await this.prepareService.process(baseParams)
            await this.sendHeartbeatService.process(baseParams)
            const { result: executeResult } = await this.executeService.process({
                ...baseParams,
                prepareResult,
            })
            await this.sendHeartbeatService.process(baseParams)
            await this.confirmService.process(
                {
                    ...baseParams,
                    executeResult,
                }
            )
            await this.sendHeartbeatService.process(baseParams)
            await this.onCompletedService.process(baseParams)
        } catch (error) {
            await this.onFailedService.process({
                ...baseParams,
                error: error as Error,
            })
        }
    }
}


