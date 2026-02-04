import {
    Injectable
} from "@nestjs/common"
import {
    ExecuteParams,
    ExecuteResult,
    OpenPositionJobData,
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
    OpenPositionActionService,
    PrepareOpenPositionResult,
    ExecuteOpenPositionResult,
} from "@modules/blockchains"
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
        private readonly openPositionActionService: OpenPositionActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) {}

    /**
     * EXECUTE phase.
     *
     * Executes prepared swap transactions and persists a state transition:
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
                WinstonLog.OpenPositionJobAlreadyExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
            const { 
                openPositionTransaction, 
                executeResult, 
                transactionRecord 
            } = job.data as ToStringObject<OpenPositionJobData>
            return {
                result: {
                    openPositionTransaction: this.superJson.parse<PrepareOpenPositionResult>(openPositionTransaction),
                    executeResult: executeResult ? this.superJson.parse<ExecuteOpenPositionResult>(executeResult) : undefined,
                    transactionRecord: transactionRecord ? this.superJson.parse<AddTransactionRecordParams>(transactionRecord) : undefined,
                }
            }
        }
        const { openPositionTransaction } = prepareResult
        const stimulate = envConfig().executor.runtime.operation.openPosition.stimulate
        const executeResult = await this.openPositionActionService.execute(
            {
                bot,
                txHash: openPositionTransaction.txHash,
                signatureWithBytes: openPositionTransaction.signatureWithBytes,
                solanaTx: openPositionTransaction.solanaTx,
                state: {
                    static: liquidityPool,
                    dynamic: dynamicLiquidityPoolInfo,
                },
                txCheck: isRetry || (payload.isRetry ?? false),
                stimulate,
            }
        )
        const transactionRecord: AddTransactionRecordParams = {
            bot,
            txHash: openPositionTransaction.txHash,
            chainId: bot.chainId,
            type: TransactionType.OpenPosition,
            isStimulated: stimulate,
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
                        "data.executeResult": this.superJson.stringify(executeResult),
                        "data.transactionRecord": this.superJson.stringify(transactionRecord),
                    },
                }
            )
        return {
            result: {
                ...prepareResult,
                transactionRecord,
                executeResult,
            }
        }
    }
}

