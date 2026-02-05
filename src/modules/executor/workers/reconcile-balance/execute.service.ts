import {
    Injectable
} from "@nestjs/common"
import {
    ExecuteParams,
    ExecuteResult,
    ReconcileBalanceBalanceAmounts,
    ReconcileBalanceJobData
} from "./types"
import {
    BalanceActionService,
    PrepareReconcileBalanceTransactionResult
} from "@modules/blockchains/balance"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    envConfig 
} from "@modules/env"
import {
    DayjsService,
    AsyncService,
    InjectSuperJson,
} from "@modules/mixin"
import {
    AbstractException,
    ReconcileBalanceJobExecutedFailedException,
} from "@exceptions"
import {
    FatalError,
} from "../fatal"
import {
    UnrecoverableError,
} from "bullmq"
import {
    ToStringObject 
} from "@modules/typedefs"
import {
    SuperJSON 
} from "superjson"
import {
    AddTransactionRecordParams 
} from "@modules/blockchains"

@Injectable()
export class ExecuteService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly dayjsService: DayjsService,
        private readonly asyncService: AsyncService,
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
        }: ExecuteParams
    ): Promise<ExecuteResult> {
        const isRetry = bullmqJob.attemptsMade > 0
        // Guard: if job already passed EXECUTED phase, do nothing
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Executed)
        ) {
            const { 
                transactionRecords: stringifiedTransactionRecords,
                reconcileBalanceTransaction: stringifiedReconcileBalanceTransaction,
                balanceAmounts: stringifiedBalanceAmounts,
            } = job.data as ToStringObject<ReconcileBalanceJobData>
            const transactionRecords = stringifiedTransactionRecords ? this.superJson.parse<Array<AddTransactionRecordParams>>(stringifiedTransactionRecords) : undefined
            const reconcileBalanceTransaction = stringifiedReconcileBalanceTransaction ? this.superJson.parse<PrepareReconcileBalanceTransactionResult>(stringifiedReconcileBalanceTransaction) : undefined
            const balanceAmounts = this.superJson.parse<ReconcileBalanceBalanceAmounts>(stringifiedBalanceAmounts)
            this.winstonService.log(
                WinstonLog.ReconcileBalanceJobAlreadyExecuted,
                {
                    botId: bot.id,
                    jobId: job.id,
                    ageMs: this.dayjsService.now().diff(job.createdAt,
                        "millisecond"),
                }
            )
            return {
                result: {
                    balanceAmounts,
                    transactionRecords,
                    reconcileBalanceTransaction,
                }
            }
        }

        const { reconcileBalanceTransaction } = prepareResult
        const [
            , 
            error,
        ] = await this.asyncService.resolveTuple(
            this.balanceActionService.executeReconcileBalanceTransaction(
                {
                    bot,
                    prepareTxs: reconcileBalanceTransaction?.prepareTxs ?? [],
                    isRetry: isRetry || (payload.isRetry ?? false),
                    stimulate: envConfig().executor.runtime.operation.reconcileBalance.stimulate,
                }
            ),
        )
        if (error) {
            const failedError = new ReconcileBalanceJobExecutedFailedException({
                originalError: error,
                botId: bot.id,
                jobId: job.id,
            })
            if (error instanceof AbstractException) {
                throw new FatalError(failedError.toJSON())
            }
            throw new UnrecoverableError(failedError.toJSON())
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
                    },
                }
            )
        return {
            result: {
                ...prepareResult,
            }
        }
    }
}

