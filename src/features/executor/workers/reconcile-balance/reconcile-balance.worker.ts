/**
 * Reconcile Balance Worker
 *
 * BullMQ worker (thin orchestrator) for the `reconcile-balance` queue.
 *
 * This class intentionally contains **no business logic** beyond:
 * - loading persisted Bot + Job documents
 * - constructing a shared `ProcessParams` object
 * - executing phase services in order
 *
 * Phases (services) and guarantees:
 * - PREPARE (`PrepareService.process`)
 *   - Computes reconcile plan + prepares swap transactions.
 *   - Persists Job status → `Prepared` and `data.swapTransactions`.
 * - HEARTBEAT (`SendHeartbeatService.process`)
 *   - Proves we still hold the bot lock authority; throws `UnrecoverableError` if not.
 * - EXECUTE (`ExecuteService.process`)
 *   - Executes prepared swaps.
 *   - Persists Job status → `Executed`.
 *   - Returns `transactionRecords` (used by CONFIRM).
 * - CONFIRM (`ConfirmService.process`)
 *   - Persists transaction snapshots + balance snapshot.
 *   - Persists Job status → `Confirmed`.
 * - COMPLETED (`OnCompletedService.process`)
 *   - Persists Job status → `Completed`, clears `bot.activeJob`, releases lock authority.
 * - FAILED (`OnFailedService.process`)
 *   - Logs + persists failure state (retryable vs permanent vs unrecoverable) and rethrows.
 *
 * Heartbeats are placed between phases to avoid long-running jobs continuing after lock loss.
 */

import {
    ReconcileBalancePayload,
} from "@modules/blockchains"
import {
    BotSchema,
    InjectPrimaryMongoose,
    JobSchema,
} from "@modules/databases"
import {
    BotNotFoundException,
    JobNotFoundException,
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
    ClearService,
    OnCompletedService,
    OnFailedService,
} from "../common"
import {
    PrepareService,
} from "./prepare.service"
import {
    ExecuteService,
} from "./execute.service"
import {
    ConfirmService,
} from "./confirm.service"
import type {
    ProcessParams,
} from "./types"
import {
    OnEvent 
} from "@nestjs/event-emitter"
import {
    EventName, LockAuthorityTimeoutEventPayload 
} from "@modules/event"
import {
    AsyncService,
} from "@modules/mixin"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"

@Worker(
    bullData[BullQueueName.ReconcileBalance].name,
    {
        concurrency: envConfig().bullmq.concurrency,
        lockDuration: envConfig().bullmq.lockDuration,
        stalledInterval: envConfig().bullmq.stalledInterval,
        maxStalledCount: envConfig().bullmq.maxStalledCount,
    }
)
export class ReconcileBalanceWorker extends WorkerHost {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly prepareService: PrepareService,
        private readonly executeService: ExecuteService,
        private readonly confirmService: ConfirmService,
        private readonly onCompletedService: OnCompletedService,
        private readonly onFailedService: OnFailedService,
        private readonly clearService: ClearService,
        private readonly asyncService: AsyncService,
        private readonly winstonService: WinstonService,
    ) {
        super()
    }

    @OnEvent(EventName.LockAuthorityTimeout)
    async onLockAuthorityReleased(
        payload: LockAuthorityTimeoutEventPayload
    ) {
        this.winstonService.log(
            WinstonLog.ReconcileBalanceLockAuthorityReleased,
            {
                botId: payload.botId,
            }
        )
        //this.worker.cancelJob(payload.botId)
    }
    /**
     * BullMQ entrypoint for the reconcile-balance queue.
     *
     * @param bullmqJob - Raw BullMQ job
     * @returns void
     *
     * @example
     * await worker.process(bullmqJob)
     */
    async process(
        bullmqJob: Job<string>
    ): Promise<void> {
        // deserialize job payload
        const payload = this.superJson.parse<ReconcileBalancePayload>(bullmqJob.data)
        const { botId, jobId } = payload
        const [result,
            error] = await this.asyncService.resolveTuple(
            (async () => {
                // load bot document
                const bot = await this.connection
                    .model<BotSchema>(BotSchema.name)
                    .findById(payload.botId)

                // fail unrecoverable if bot not found
                if (!bot) {
                    // Wrap in UnrecoverableError so BullMQ won't keep retrying a job that can never succeed.
                    throw new UnrecoverableError(
                        new BotNotFoundException({
                            id: payload.botId,
                        }).toJSON()
                    )
                }

                // load job document
                const job = await this.connection
                    .model<JobSchema>(JobSchema.name)
                    .findById(payload.jobId)

                // fail unrecoverable if job not found
                if (!job) {
                    // Wrap in UnrecoverableError so BullMQ won't keep retrying a job that can never succeed.
                    throw new UnrecoverableError(
                        new JobNotFoundException({
                            jobId: payload.jobId,
                        }).toJSON()
                    )
                }
                return {
                    bot,
                    job,
                }
            })())
        if (error) {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceBootstrappingFailed,
                {
                    botId: botId,
                    jobId: jobId,
                    bullmqJobId: bullmqJob.id,
                    error: error.message,
                }
            )
            await this.clearService.process(
                {
                    botId,
                    jobId,
                }
            )
            return
        }
        const { bot, job } = result
        // assemble shared params for phase services
        const baseParams: ProcessParams = {
            bullmqJob,
            bot,
            job,
            payload,
        }

        // execute pipeline (failures delegated to FAILED phase)
        try {
            // PREPARE phase
            const prepareResult = await this.prepareService.process(baseParams)
            // EXECUTE phase
            const executeResult = await this.executeService.process(
                {
                    ...baseParams,
                    prepareResult,
                }
            )
            // CONFIRM phase
            await this.confirmService.process(
                {
                    ...baseParams,
                    executeResult,
                }
            )
            // ON COMPLETED phase
            await this.onCompletedService.process({
                job: baseParams.job,
                bot: baseParams.bot,
                bullmqJob: baseParams.bullmqJob,
                queueName: BullQueueName.ReconcileBalance,
            })
        } catch (error) {
            // ON FAILED phase
            await this.onFailedService.process(
                {
                    ...baseParams,
                    error: error as Error,
                    queueName: BullQueueName.ReconcileBalance,
                }
            )
        }
    }
}