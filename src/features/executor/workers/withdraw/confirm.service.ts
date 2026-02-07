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
    TransactionType,
} from "@modules/databases"
import {
    Connection,
} from "mongoose"
import type {
    ConfirmParams,
} from "./types"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    DayjsService,
} from "@modules/mixin"
import {
    SendHeartbeatService,
} from "../common"
import {
    envConfig,
} from "@modules/env"

/**
 * Service for the CONFIRM phase of withdraw jobs.
 *
 * @example
 * await confirmService.process(params)
 */
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
        private readonly sendHeartbeatService: SendHeartbeatService,
    ) {}

    /**
     * CONFIRM phase: re-fetches balances, persists transaction records and bot snapshot.
     *
     * @param params - Confirm params (bot, job, executeResult)
     * @returns void
     *
     * @example
     * await confirmService.process({ bot, job, executeResult })
     */
    async process(
        params: ConfirmParams
    ): Promise<void> {
        const { job, bot, executeResult } = params
        // guard: idempotency (return early if already confirmed)
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Confirmed)
        ) {
            this.winstonService.log(
                WinstonLog.WithdrawJobAlreadyConfirmed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    ageMs: this.dayjsService.now().diff(job.createdAt,
                        "millisecond"),
                }
            )
            return
        }
        if (!envConfig().executor.runtime.operation.withdraw.stimulate) {
            const txHashes = executeResult?.data.executeResult?.txHashes ?? []
            const {
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            } = await this.balanceFetcherService.fetchBalances({
                bot,
            })

            const session = await this.connection.startSession()
            await session.withTransaction(
                async () => {
                    for (const txHash of txHashes) {
                        await this.transactionSnapshotService.addTransactionRecord(
                            {
                                bot,
                                txHash,
                                chainId: bot.chainId,
                                type: TransactionType.Withdraw,
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
        }
        await this.sendHeartbeatService.process(params)
        this.winstonService.log(
            WinstonLog.WithdrawJobConfirmed,
            {
                botId: bot.id,
                jobId: job.id,
            }
        )
    }
}
