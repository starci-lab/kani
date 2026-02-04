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
            const { closePositionTransaction, transactionRecords } = job.data as ToStringObject<ClosePositionJobData>
            return {
                result: {
                    closePositionTransaction: this.superJson.parse<PrepareClosePositionResult>(closePositionTransaction),
                    transactionRecords: transactionRecords
                        ? this.superJson.parse<Array<AddTransactionRecordParams>>(transactionRecords)
                        : undefined,
                }
            }
        }
        const { closePositionTransaction } = prepareResult
        await this.closePositionActionService.execute(
            {
                bot,
                prepareTxs: closePositionTransaction.prepareTxs,
                state: {
                    static: liquidityPool,
                    dynamic: dynamicLiquidityPoolInfo,
                },
                txCheck: isRetry || (payload.isRetry ?? false),
                stimulate: envConfig().executor.runtime.operation.closePosition.stimulate,
            }
        )
        const txHashes = closePositionTransaction.prepareTxs.map((tx) => tx.txHash)
        const transactionRecords: Array<AddTransactionRecordParams> = txHashes.map(
            (txHash) => ({
                bot,
                txHash,
                chainId: bot.chainId,
                type: TransactionType.ClosePosition,
            }),
        )

        await this.connection
            .model<JobSchema>(JobSchema.name)
            .updateOne(
                {
                    _id: job.id
                },
                {
                    $set: {
                        status: JobStatus.Executed,
                        "data.transactionRecords": this.superJson.stringify(transactionRecords),
                    },
                }
            )
        return {
            result: {
                ...prepareResult,
                transactionRecords,
            }
        }
    }
}

