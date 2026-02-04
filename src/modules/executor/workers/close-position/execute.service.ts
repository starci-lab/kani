import {
    Injectable
} from "@nestjs/common"
import {
    ExecuteParams,
    ExecuteResult,
    ClosePositionJobData,
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
    ClosePositionActionService,
    PrepareClosePositionResult,
} from "@modules/blockchains/dexes/orchestrator"
import {
    envConfig 
} from "@modules/env"
import {
    ToStringObject 
} from "@modules/typedefs"
import {
    InjectSuperJson 
} from "@modules/mixin"
import {
    SuperJSON 
} from "superjson"

@Injectable()
export class ExecuteService {
    constructor(
        private readonly closePositionActionService: ClosePositionActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
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
            dynamicLiquidityPoolInfo,
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
            const { closePositionTransaction, transactionRecord } = job.data as ToStringObject<ClosePositionJobData>
            return {
                result: {
                    closePositionTransaction: this.superJson.parse<PrepareClosePositionResult>(closePositionTransaction),
                    transactionRecord: transactionRecord ? this.superJson.parse<AddTransactionRecordParams>(transactionRecord) : undefined,
                }
            }
        }
        const { closePositionTransaction } = prepareResult
        await this.closePositionActionService.execute(
            {
                bot,
                txHash: closePositionTransaction.txHash,
                signatureWithBytes: closePositionTransaction.signatureWithBytes,
                solanaTx: closePositionTransaction.solanaTx,
                state: {
                    static: liquidityPool,
                    dynamic: dynamicLiquidityPoolInfo,
                },
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
                        "data.transactionRecord": this.superJson.stringify(transactionRecord),
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

