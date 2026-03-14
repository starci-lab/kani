import {
    Injectable 
} from "@nestjs/common"
import {
    ReconcileBalanceTaskConfirmParams 
} from "../types"
import {
    WinstonService, WinstonLog 
} from "@modules/winston"
import {
    InjectPrimaryMongoose,
    JobSchema,
    TaskType
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    SendHeartbeatService 
} from "../../send-heartbeat.service"
import {
    BalanceSnapshotService,
    BalanceFetcherService
} from "@modules/blockchains"
import BN from "bn.js"
import {
    ActionJobStimulateMongoSessionException 
} from "@modules/exceptions"
import {
    envConfig 
} from "@modules/env"
import {
    strict as assert,
} from "node:assert"
import {
    DebugContextService,
} from "../debug-context.service"
import {
    DebugLatencyService,
} from "@modules/debug"

@Injectable()
export class ReconcileBalanceTaskConfirmService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
    ) { }

    /**
     * Process the CLOSE POSITION TASK CONFIRM step.
     * @param params - The parameters for the CLOSE POSITION TASK CONFIRM step.
     * @param params.bot - The bot.
     * @param params.job - The job.
     * @param params.isRetry - Whether the task is being retried.
     * @param params.taskIndex - The index of the task.
     */
    async process(
        {
            bot,
            job,
            taskIndex,
            bullmqJob,
            jobType,
        }: ReconcileBalanceTaskConfirmParams
    ) {
        const contextPayload = this.debugContextService.createContextPayload({
            jobType,
            jobId: job.id,
            botId: bot.id,
        })
        try {
            await this.sendHeartbeatService.process(
                {
                    bot,
                    job,
                    bullmqJob,
                },
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Heartbeat sent successfully",
            })
            const stepCount = job.tasks[taskIndex].stepCount
            let targetBalanceAmount = new BN(0)
            let quoteBalanceAmount = new BN(0)
            let gasBalanceAmount = new BN(0)
            if (stepCount > 0) {
                const fetched = await this.balanceFetcherService.fetchBalances(
                    {
                        bot,
                    },
                )
                this.debugLatencyService.measure({
                    id: contextPayload.id,
                    description: "Balances fetched successfully",
                })
                targetBalanceAmount = new BN(fetched.targetBalanceAmount)
                quoteBalanceAmount = new BN(fetched.quoteBalanceAmount)
                gasBalanceAmount = new BN(fetched.gasBalanceAmount)
            }
            try {
                const session = await this.connection.startSession()
                await session.withTransaction(
                    async (
                        clientSession
                    ) => {
                        if (stepCount > 0) {
                        // update the balance snapshots
                            await this.balanceSnapshotService.updateBotSnapshotBalancesRecord(
                                {
                                    bot,
                                    targetBalanceAmount,
                                    quoteBalanceAmount,
                                    gasBalanceAmount,
                                    session: clientSession,
                                }
                            )
                        }
                        // update the job with the confirmed status
                        const updateJobResult = await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                            {
                                _id: job.id,
                            },
                            {
                                $set: {
                                    "tasks.$[task].confirmed": true,
                                },
                                $inc: {
                                    taskIndex: 1,
                                },
                            },
                            {
                                arrayFilters: [
                                    {
                                        "task.index": taskIndex,
                                        "task.type": TaskType.ReconcileBalance,
                                    },
                                ],
                                session: clientSession,
                            },
                        )
                        assert(updateJobResult.matchedCount > 0)
                        // throw an exception to stimulate the mongo session
                        if (envConfig().executor.runtime.operation.reconcileBalance.stimulate) {
                            throw new ActionJobStimulateMongoSessionException({
                                botId: bot.id,
                                jobId: job.id,
                                taskIndex,
                            })
                        }
                    })
            } catch (error) {
                if (!(error instanceof ActionJobStimulateMongoSessionException)) {
                    throw error
                }
            }
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Transaction confirmed successfully",
            })
            this.winstonService.log(
                WinstonLog.ActionJobTaskConfirmed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: jobType,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActionJobTaskConfirmedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: jobType,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.ReconcileBalance,
                    metadata: job.metadata,
                }
            )
            throw error
        }
    }
}