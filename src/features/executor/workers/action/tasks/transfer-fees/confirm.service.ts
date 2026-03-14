import {
    Injectable
} from "@nestjs/common"
import {
    TransferFeesTaskConfirmParams
} from "../types"
import {
    WinstonService,
    WinstonLog
} from "@modules/winston"
import {
    InjectPrimaryMongoose,
    JobSchema,
    JobType,
    TaskType
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    envConfig
} from "@modules/env"
import {
    ActionJobStimulateMongoSessionException,
    PositionIdNotFoundException,
    TaskPrepareResultNotFoundException,
} from "@modules/exceptions"
import {
    SendHeartbeatService
} from "../../send-heartbeat.service"
import {
    ExecuteWithdrawTransactionResult,
    PrepareTransferFeesTransactionResult,
    TransferFeesSnapshotService
} from "@modules/blockchains"
import {
    InjectSuperJson
} from "@modules/mixin"
import SuperJSON from "superjson"
import BN from "bn.js"
import {
    DebugContextService,
} from "../debug-context.service"
import {
    DebugLatencyService,
} from "@modules/debug"

/**
 * Service for the Transfer Fees Task CONFIRM step.
 */
@Injectable()
export class TransferFeesTaskConfirmService {
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly transferFeesSnapshotService: TransferFeesSnapshotService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
    ) {}

    /**
     * Process the Transfer Fees Task CONFIRM step.
     */
    async process({
        bot,
        job,
        taskIndex,
        bullmqJob,
    }: TransferFeesTaskConfirmParams) {
        const contextPayload = this.debugContextService.createContextPayload({
            jobType: JobType.TransferFees,
            jobId: job.id,
            botId: bot.id,
        })
        try {
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Heartbeat sent successfully",
            })
            try {
                const session = await this.connection.startSession()
                await session.withTransaction(
                    async (clientSession) => {
                        await this.connection
                            .model<JobSchema>(JobSchema.name)
                            .updateOne(
                                {
                                    _id: job.id
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
                                            "task.type": TaskType.TransferFees,
                                        },
                                    ],
                                    session: clientSession,
                                },
                            )
                        const task = job.tasks[taskIndex]
                        const positionId = bot.activePosition?.position?.toString()
                        if (!positionId) {
                            throw new PositionIdNotFoundException({
                                botId: bot.id,
                            })
                        }
                        if (!task.prepareResult) {
                            throw new TaskPrepareResultNotFoundException({
                                botId: bot.id,
                                taskIndex,
                                taskType: TaskType.TransferFees,
                            })
                        }
                        const prepareResult = this.superJson.parse<PrepareTransferFeesTransactionResult>(
                            task.prepareResult,
                        )
                        const feeTargetAmount = prepareResult?.feeAmountTarget ?? new BN(0)
                        const feeQuoteAmount = prepareResult?.feeAmountQuote ?? new BN(0)
                        const feeTransferTxHashes = task.steps
                            .map((step) => {
                                const exec = step?.executeResult
                                    ? this.superJson.parse<ExecuteWithdrawTransactionResult>(step.executeResult)
                                    : null
                                return exec?.txHash
                            })
                            .filter((txHash): txHash is string => Boolean(txHash))
                        await this.transferFeesSnapshotService.updateTransferFeesRecord(
                            {
                                botId: bot.id,
                                positionId,
                                feeTargetAmount,
                                feeQuoteAmount,
                                feeTransferTxHashes,
                                session: clientSession,
                            }
                        )
                        if (envConfig().executor.runtime.operation?.transferFees?.stimulate) {
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
                description: "Confirm transaction successfully",
            })
            this.winstonService.log(
                WinstonLog.ActionJobTaskConfirmed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: job.type ?? JobType.TransferFees,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                }
            )
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActionJobTaskConfirmedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: job.type ?? JobType.TransferFees,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                    metadata: job.metadata,
                }
            )
            throw error
        }
    }
}
