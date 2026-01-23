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
 *   - Persists Job status → `Prepared` and `metadata.swapTransactions`.
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
    PrepareService,
} from "./prepare.service"
import {
    ExecuteService,
} from "./execute.service"
import {
    SendHeartbeatService,
} from "./send-heartbeat.service"
import {
    ConfirmService,
} from "./confirm.service"
import {
    OnCompletedService,
} from "./on-completed.service"
import {
    OnFailedService,
} from "./on-failed.service"
import {
    ProcessParams,
} from "./types"
import {
    OnEvent 
} from "@nestjs/event-emitter"
import {
    EventName, LockAuthorityTimeoutEventPayload 
} from "@modules/event"

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
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly executeService: ExecuteService,
        private readonly confirmService: ConfirmService,
        private readonly onCompletedService: OnCompletedService,
        private readonly onFailedService: OnFailedService,
    ) {
        super()
    }

    @OnEvent(EventName.LockAuthorityTimeout)
    async onLockAuthorityReleased(
        payload: LockAuthorityTimeoutEventPayload
    ) {
        console.log(payload)
        //this.worker.cancelJob(payload.botId)
    }
    /**
     * BullMQ entrypoint for the `reconcile-balance` queue.
     *
     * Execution pipeline (idempotent phases):
     * PREPARE → HEARTBEAT → EXECUTE → HEARTBEAT → CONFIRM → HEARTBEAT → COMPLETED
     *
     * On error: delegates to FAILED phase (which persists status/logs) and rethrows.
     */
    async process(
        bullmqJob: Job<string>
    ): Promise<void> {
        // Deserialize the job payload (SuperJSON) into a typed reconcile-balance payload.
        const payload = this.superJson.parse<ReconcileBalancePayload>(bullmqJob.data)
        // Determine whether this BullMQ execution is a retry attempt.
        const isRetry = bullmqJob.attemptsMade > 0
        // On retries, if the job never recorded any progress, exit early to avoid reprocessing.
        if (isRetry && !bullmqJob.progress) {
            // No-op: nothing to do if progress was never set on a retry.
            return
        }
        // Load the Bot document from MongoDB (required for all phases).
        const bot = await this.connection
            // Use the Bot model from the primary mongoose connection.
            .model<BotSchema>(BotSchema.name)
            // Find the bot by id provided by the payload.
            .findById(payload.botId)

        // If bot is missing, fail permanently (unrecoverable) because the job cannot proceed.
        if (!bot) {
            // Wrap in UnrecoverableError so BullMQ won't keep retrying a job that can never succeed.
            throw new UnrecoverableError(
                // Produce a structured error payload for consistent logging/handling.
                new BotNotFoundException(
                    // Include the botId for diagnostics.
                    {
                        botId: payload.botId,
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
            .findById(payload.jobId)

        // If job is missing, fail permanently (unrecoverable) because we cannot track status/metadata.
        if (!job) {
            // Wrap in UnrecoverableError so BullMQ won't keep retrying a job that can never succeed.
            throw new UnrecoverableError(
                // Produce a structured error payload for consistent logging/handling.
                new JobNotFoundException(
                    // Include the jobId for diagnostics.
                    {
                        jobId: payload.jobId,
                    }
                // Serialize to JSON for UnrecoverableError consumption.
                ).toJSON()
            )
        }

        // Record initial progress so retry guards can distinguish "started" vs "never started".
        await bullmqJob.updateProgress(1)

        // Assemble a shared parameter object passed to all phase services.
        const baseParams: ProcessParams = {
            // BullMQ job context (attempts, progress, ids, etc.).
            bullmqJob,
            // Loaded bot document.
            bot,
            // Loaded job document.
            job,
            // Parsed reconcile-balance payload.
            payload,
        }

        // Execute the reconcile-balance pipeline; failures are delegated to the FAILED phase.
        try {
            // PREPARE phase
            // Compute reconcile plan + prepare swap transactions + persist Prepared status/metadata.
            const { result: prepareResult } = await this.prepareService.process(baseParams)
            
            // HEARTBEAT phase (before executing on-chain transactions)
            // Ensure the lock authority is still held before performing side effects.
            await this.sendHeartbeatService.process(baseParams)

            // EXECUTE phase

            // Execute prepared swaps; returns transaction records for snapshotting.
            const { result: executeResult } = await this.executeService.process(
                // Extend the base params with the PREPARE output.
                {
                    // Carry base context forward.
                    ...baseParams,
                    // Provide prepared transactions/metadata to EXECUTE.
                    prepareResult,
                }
            )

            // HEARTBEAT phase (before post-transaction persistence)
            // Ensure the lock authority is still held before persisting post-tx snapshots.
            await this.sendHeartbeatService.process(baseParams)

            // CONFIRM phase
            // Persist transaction snapshots + updated balances snapshot + set Confirmed status.
            await this.confirmService.process(
                // Extend the base params with the EXECUTE output.
                {
                    // Carry base context forward.
                    ...baseParams,
                    // Provide executed transaction records/metadata to CONFIRM.
                    executeResult,
                }
            )
            // HEARTBEAT phase (before finalization + unlock)
            // Ensure the lock authority is still held before finalizing and unlocking.
            await this.sendHeartbeatService.process(baseParams)
            // ON COMPLETED phase
            // Mark job completed, clear bot activeJob, release lock authority.
            await this.onCompletedService.process(baseParams)
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