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
    ConfirmResult,
} from "./types"
import {
    WinstonLog,
    WinstonService 
} from "@modules/winston"
import {
    envConfig
} from "@modules/env"
import {
    DayjsService 
} from "@modules/mixin"
import {
    SendHeartbeatService,
} from "../common"

/**
 * Service for the CONFIRM phase of reconcile-balance jobs.
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
    ): Promise<ConfirmResult> {
        const { job, bot, executeResult } = params
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Confirmed)
        ) {
            this.winstonService.log(
                WinstonLog.ReconcileBalanceJobAlreadyConfirmed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    ageMs: this.dayjsService.now().diff(job.createdAt,
                        "millisecond"),
                }
            )
            return
        }
        if (!envConfig().executor.runtime.operation.reconcileBalance.stimulate) {
            const txHashes = executeResult?.data?.executeResult?.txHashes ?? []
            // fetch balances post execution
            const {
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            } = await this.balanceFetcherService.fetchBalances(
                {
                    bot 
                }
            )
            const session = await this.connection.startSession()
            await session.withTransaction(
                async () => {
                // skip when stimulate is enabled
                    if (envConfig().executor.runtime.operation.reconcileBalance.stimulate) {
                        return
                    }
                    for (const txHash of txHashes) {
                        await this.transactionSnapshotService.addTransactionRecord(
                            {
                                bot,
                                txHash,
                                chainId: bot.chainId,
                                type: TransactionType.ReconcileBalance,
                                session,
                            }
                        )
                    }
                    // update bot balance snapshot
                    await this.balanceSnapshotService.updateBotSnapshotBalancesRecord(
                        {
                            bot,
                            targetBalanceAmount,
                            quoteBalanceAmount,
                            gasBalanceAmount,
                            session,
                        }
                    )
                    // update job status to CONFIRMED
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
            WinstonLog.ReconcileBalanceJobConfirmed,
            {
                botId: bot.id,
                jobId: job.id,
            }
        )
    }
}


