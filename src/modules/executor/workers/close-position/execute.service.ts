import {
    Injectable
} from "@nestjs/common"
import {
    ExecuteParams,
    ExecuteResult,
    ClosePositionJobMetadata,
} from "./types"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    TransactionType,
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    AddTransactionRecordParams,
    ClosePositionOrchestratorService 
} from "@modules/blockchains"
import {
    envConfig 
} from "@modules/env"

@Injectable()
export class ExecuteService {
    constructor(
        private readonly closePositionOrchestratorService: ClosePositionOrchestratorService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
    ) {}

    /**
     * EXECUTE phase.
     *
     * Executes prepared close-position transactions and persists a state transition:
     * PREPARED → EXECUTED. Also returns `transactionRecords` for the CONFIRM phase.
     *
     * Idempotency: if the job is already at/after EXECUTED, returns the existing metadata.
     */
    async process(
        {
            job,
            bot,
            bullmqJob,
            prepareResult,
            payload,
            state,
            liquidityPool,
        }: ExecuteParams
    ): Promise<ExecuteResult> {
        const isRetry = bullmqJob.attemptsMade > 0
        // Guard: if job already passed EXECUTED phase, do nothing
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Executed)
        ) {
            this.winstonService.log(
                WinstonLog.ClosePositionJobAlreadyExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            return {
                result: job.metadata as ClosePositionJobMetadata
            }
        }
        const { closePositionTransaction } = prepareResult
        await this.closePositionOrchestratorService.execute(
            {
                bot,
                txHash: closePositionTransaction.txHash,
                signatureWithBytes: closePositionTransaction.signatureWithBytes,
                solanaTx: closePositionTransaction.solanaTx,
                state,
                txCheck: isRetry || (payload.isRetry ?? false),
                stimulate: envConfig().executor.runtime.operation.closePosition.stimulate,
            }
        )
        const transactionRecord: AddTransactionRecordParams = {
            bot,
            txHash: closePositionTransaction.txHash,
            chainId: bot.chainId,
            type: TransactionType.ClosePosition,
            isStimulated: envConfig().executor.runtime.operation.closePosition.stimulate,
        }

        await this.connection
            .model<JobSchema>(JobSchema.name)
            .updateOne(
                {
                    _id: job.id
                },
                {
                    $set: {
                        status: JobStatus.Executed,
                        "metadata.transactionRecord": transactionRecord,
                    },
                }
            )
        return {
            result: {
                ...prepareResult,
                transactionRecord,
            }
        }
    }
}

