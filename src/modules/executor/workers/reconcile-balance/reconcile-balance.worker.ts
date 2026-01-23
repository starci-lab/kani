/**
 * Reconcile Balance Worker
 *
 * Thin BullMQ worker (orchestrator) that delegates each phase to a dedicated service:
 * - PrepareService
 * - SendHeartbeatService
 * - ExecuteService
 * - ConfirmService
 * - OnCompletedService
 * - OnFailedService
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

    /**
     * BullMQ entrypoint for the reconcile-balance queue.
     *
     * Pipeline:
     * prepare → heartbeat → execute → heartbeat → confirm → heartbeat → completed
     *
     * On error: delegates to OnFailedService (which persists status/logs) and rethrows.
     */
    async process(
        bullmqJob: Job<string>
    ): Promise<void> {
        const isRetry = bullmqJob.attemptsMade > 0
        if (isRetry && !bullmqJob.progress) {
            return
        }

        const payload = this.superJson.parse<ReconcileBalancePayload>(bullmqJob.data)

        const bot = await this.connection
            .model<BotSchema>(BotSchema.name)
            .findById(payload.botId)

        if (!bot) {
            throw new UnrecoverableError(
                new BotNotFoundException(
                    {
                        botId: payload.botId,
                    }
                ).toJSON()
            )
        }

        const job = await this.connection
            .model<JobSchema>(JobSchema.name)
            .findById(payload.jobId)

        if (!job) {
            throw new UnrecoverableError(
                new JobNotFoundException(
                    {
                        jobId: payload.jobId,
                    }
                ).toJSON()
            )
        }

        await bullmqJob.updateProgress(1)

        const baseParams = {
            bullmqJob,
            bot,
            job,
            payload,
        }

        try {
            const { result: prepareResult } = await this.prepareService.process(baseParams)

            await this.sendHeartbeatService.process(baseParams)

            const { result: executeResult } = await this.executeService.process(
                {
                    ...baseParams,
                    prepareResult,
                }
            )

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
            await this.onFailedService.process(
                {
                    ...baseParams,
                    error: error as Error,
                }
            )
        }
    }
}