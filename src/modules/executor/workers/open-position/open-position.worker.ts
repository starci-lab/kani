/**
 * Open Position Worker
 *
 * BullMQ worker (thin orchestrator) for the `open-position` queue.
 *
 * This class intentionally contains **no business logic** beyond:
 * - loading persisted Bot + Job documents
 * - loading the target Liquidity Pool + its current on-chain/off-chain state
 * - constructing a shared `ProcessParams` object for phase services
 * - executing phase services in order
 *
 * Phases (services) and guarantees:
 * - PREPARE (`PrepareService.process`)
 *   - Builds an open-position transaction (no execution here).
 *   - Persists Job status → `Prepared` and `metadata.openPositionTransaction`.
 * - HEARTBEAT (`SendHeartbeatService.process`)
 *   - Proves we still hold the bot lock authority; throws `UnrecoverableError` if not.
 * - COMPLETED (`OnCompletedService.process`)
 *   - Persists Job status → `Completed`, clears `bot.activeJob`, releases lock authority.
 * - FAILED (`OnFailedService.process`)
 *   - Logs + persists failure state (retryable vs permanent vs unrecoverable) and rethrows.
 *
 * Heartbeats are placed between phases to avoid long-running jobs continuing after lock loss.
 */

import {
    LiquidityPoolStateService,
    OpenPositionPayload,
} from "@modules/blockchains"
import {
    BotSchema,
    InjectPrimaryMongoose,
    JobSchema,
    PrimaryMemoryStorageService,
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
    OnEvent 
} from "@nestjs/event-emitter"
import {
    EventName, LockAuthorityTimeoutEventPayload 
} from "@modules/event"
import {
    PrepareService 
} from "./prepare.service"
import {
    SendHeartbeatService 
} from "./send-heartbeat.service"
import {
    OnCompletedService 
} from "./on-completed.service"
import {
    OnFailedService 
} from "./on-failed.service"
import {
    ClearService 
} from "./clear.service"
import {
    ProcessParams 
} from "./types"
import {
    ExecuteService 
} from "./execute.service"
import {
    TokenType 
} from "@modules/typedefs"
import {
    ConfirmService 
} from "./confirm.service"
import {
    AsyncService
} from "@modules/mixin"

@Worker(
    bullData[BullQueueName.OpenPosition].name,
    {
        concurrency: envConfig().bullmq.concurrency,
        lockDuration: envConfig().bullmq.lockDuration,
        stalledInterval: envConfig().bullmq.stalledInterval,
        maxStalledCount: envConfig().bullmq.maxStalledCount,
    }
)
export class OpenPositionWorker extends WorkerHost {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly prepareService: PrepareService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly onCompletedService: OnCompletedService,
        private readonly onFailedService: OnFailedService,
        private readonly confirmService: ConfirmService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly executeService: ExecuteService,
        private readonly clearService: ClearService,
        private readonly asyncService: AsyncService,
    ) {
        super()
    }

    @OnEvent(EventName.LockAuthorityTimeout)
    async onLockAuthorityReleased(
        payload: LockAuthorityTimeoutEventPayload
    ) {
        console.log("onLockAuthorityReleased",
            payload)
    }
    /**
     * BullMQ entrypoint for the `open-position` queue.
     *
     * Execution pipeline (idempotent phases):
     * PREPARE → HEARTBEAT → COMPLETED
     *
     * On error: delegates to FAILED phase (which persists status/logs) and rethrows.
     */
    async process(
        bullmqJob: Job<string>
    ): Promise<void> {
        // Deserialize the job payload (SuperJSON) into a typed open-position payload.
        const payload = this.superJson.parse<OpenPositionPayload>(bullmqJob.data)
        const { botId, jobId, liquidityPoolId } = payload
        const [result,
            error] = await this.asyncService.resolveTuple(
            (async () => {
                // On retries, if the job never recorded any progress, exit early to avoid reprocessing.
                // Load the Bot document from MongoDB (required for all phases).
                const bot = await this.connection
                // Use the Bot model from the primary mongoose connection.
                    .model<BotSchema>(BotSchema.name)
                // Find the bot by id provided by the payload.
                    .findById(botId)

                // If bot is missing, fail permanently (unrecoverable) because the job cannot proceed.
                if (!bot) {
                    // Wrap in UnrecoverableError so BullMQ won't keep retrying a job that can never succeed.
                    throw new UnrecoverableError(
                        // Produce a structured error payload for consistent logging/handling.
                        new BotNotFoundException(
                            // Include the botId for diagnostics.
                            {
                                botId,
                            }
                            // Serialize to JSON for UnrecoverableError consumption.
                        ).toJSON()
                    )
                }

                // Load the Job document from MongoDB (used for status transitions + stored metadata).
                const job = await this.connection
                // Use the Job model from the primary mongoose connection.
                    .model<JobSchema>(JobSchema.name)
                // Find the job by id provided by the payload.
                    .findById(jobId)

                // If job is missing, fail permanently (unrecoverable) because we cannot track status/metadata.
                if (!job) {
                    // Wrap in UnrecoverableError so BullMQ won't keep retrying a job that can never succeed.
                    throw new UnrecoverableError(
                        // Produce a structured error payload for consistent logging/handling.
                        new JobNotFoundException(
                            // Include the jobId for diagnostics.
                            {
                                jobId,
                            }
                            // Serialize to JSON for UnrecoverableError consumption.
                        ).toJSON()
                    )
                }
                const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
                    displayId: {
                        $eq: liquidityPoolId,
                    }
                })
                if (!liquidityPool) {
                    throw new UnrecoverableError(
                        new LiquidityPoolNotFoundException(
                            {
                                displayId: liquidityPoolId,
                            }
                        ).toJSON()
                    )
                }
                const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                    id: {
                        $eq: bot.targetToken.toString()
                    }
                })
                if (!targetToken) {
                    throw new TokenNotFoundException({
                        id: bot.targetToken.toString(),
                    })
                }
                const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                    id: {
                        $eq: bot.quoteToken.toString()
                    }
                })
                if (!quoteToken) {
                    throw new TokenNotFoundException({
                        id: bot.quoteToken.toString(),
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
                const state = await this.liquidityPoolStateService.getState(liquidityPool)
                return {
                    bot,
                    job,
                    liquidityPool,
                    state,
                    targetToken,
                    quoteToken,
                    gasToken,
                }
            })())
        if (error) {
            console.error(error)
            await this.clearService.process(
                {
                    botId: payload.botId,
                    jobId: payload.jobId,
                }
            )
            return
        }
        const { bot, job, liquidityPool, state, targetToken, quoteToken, gasToken } = result
        // Assemble a shared parameter object passed to all phase services.
        const baseParams: ProcessParams = {
            // BullMQ job context (attempts, progress, ids, etc.).
            bullmqJob,
            // Loaded bot document.
            bot,
            // Loaded job document.
            job,
            // Parsed open-position payload.
            payload,
            // Liquidity pool.
            liquidityPool,
            // Liquidity pool state.
            state,
            // Target token.
            targetToken,
            // Quote token.
            quoteToken,
            // Gas token.
            gasToken,
        }
        // Execute the open-position pipeline; failures are delegated to the FAILED phase.
        try {
            // PREPARE phase
            // Prepare open-position transaction + persist Prepared status/metadata.
            const { result: prepareResult } = await this.prepareService.process(baseParams)
            // HEARTBEAT phase (before any side-effecting continuation)
            await this.sendHeartbeatService.process(baseParams)
            // EXECUTE phase
            // Execute open-position transaction + persist Executed status/metadata.
            const { result: executeResult } = await this.executeService.process(
                {
                    ...baseParams,
                    prepareResult,
                }
            )
            // HEARTBEAT phase (before post-transaction persistence)
            await this.sendHeartbeatService.process(baseParams)
            // CONFIRM phase
            // Confirm open-position transaction + persist Confirmed status/metadata.
            await this.confirmService.process(
                {
                    ...baseParams,
                    executeResult,
                }
            )
            // HEARTBEAT phase (before finalization + unlock)
            await this.sendHeartbeatService.process(baseParams)
            // ON COMPLETED phase
            // Mark job completed, clear bot activeJob, release lock authority.
            this.onCompletedService.process(baseParams)
        } catch (error) {
            // ON FAILED phase
            // Persist failure status/logs (retryable vs permanent vs unrecoverable) and rethrow.
            await this.onFailedService.process(
                // Extend base params with the thrown error.
                {
                    // Carry base context forward.
                    ...baseParams,
                    // Attach error for classification + persistence.
                    error: error as Error,
                }
            )
        }
    }
}