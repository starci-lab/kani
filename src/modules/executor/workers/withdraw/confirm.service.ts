import {
    Injectable,
} from "@nestjs/common"
import {
    BalanceFetcherService,
    BalanceSnapshotService,
    TransactionSnapshotService,
} from "@modules/blockchains"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import {
    ConfirmParams,
    WithdrawJobData,
} from "./types"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    DayjsService,
    InjectSuperJson,
} from "@modules/mixin"
import {
    ToStringObject 
} from "@modules/typedefs"
import {
    PrepareWithdrawTransactionResult 
} from "@modules/blockchains"
import {
    AddTransactionRecordParams 
} from "@modules/blockchains"
import {
    SuperJSON 
} from "superjson"

@Injectable()
export class ConfirmService {
    constructor(
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly transactionSnapshotService: TransactionSnapshotService,
        private readonly balanceSnapshotService: BalanceSnapshotService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly winstonService: WinstonService,
        private readonly dayjsService: DayjsService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) {}

    /**
     * CONFIRM phase.
     *
     * Post-transaction bookkeeping after swaps have been executed:
     * - re-fetch balances from chain
     * - persist transaction snapshot records (if any)
     * - persist updated bot balance snapshot
     * - transition job status to CONFIRMED
     *
     * Idempotency: if the job is already at/after CONFIRMED, returns early.
     */
    async process(
        {
            bot,
            job,
            executeResult,
        }: ConfirmParams
    ) {
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Confirmed)
        ) {
            const { 
                withdrawTransaction: stringifiedWithdrawTransaction, 
                transactionRecords: stringifiedTransactionRecords 
            } = job.data as ToStringObject<WithdrawJobData>
            const withdrawTransaction = this.superJson.parse<PrepareWithdrawTransactionResult>(stringifiedWithdrawTransaction)
            const transactionRecords = stringifiedTransactionRecords ? this.superJson.parse<Array<AddTransactionRecordParams>>(stringifiedTransactionRecords) : undefined
            this.winstonService.log(
                WinstonLog.WithdrawJobAlreadyConfirmed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    ageMs: this.dayjsService.now().diff(job.createdAt,
                        "millisecond"),
                }
            )
            return {
                result: {
                    withdrawTransaction,
                    transactionRecords,
                }
            }
        }
        // re-fetch balances post execution
        const {
            targetBalanceAmount,
            quoteBalanceAmount,
            gasBalanceAmount,
        } = await this.balanceFetcherService.fetchBalances({
            bot
        })

        const session = await this.connection.startSession()
        await session.withTransaction(
            async () => {
                for (const transactionRecord of executeResult.transactionRecords || []) {
                    await this.transactionSnapshotService.addTransactionRecord(
                        {
                            ...transactionRecord,
                            session,
                        }
                    )
                }

                await this.balanceSnapshotService.updateBotSnapshotBalancesRecord(
                    {
                        bot,
                        targetBalanceAmount,
                        quoteBalanceAmount,
                        gasBalanceAmount,
                        session,
                    }
                )

                await this.connection
                    .model<JobSchema>(JobSchema.name)
                    .updateOne(
                        {
                            _id: job.id,
                        },
                        {
                            $set: {
                                status: JobStatus.Confirmed,
                            },
                        },
                        {
                            session,
                        }
                    )
            }
        )
        this.winstonService.log(
            WinstonLog.WithdrawJobConfirmed,
            {
                botId: bot.id,
                jobId: job.id,
            }
        )
    }
}


