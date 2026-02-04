import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareParams,
    PrepareResult,
    ReconcileBalanceJobData,
} from "./types"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobStatus,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    BotWithdrawalAddressNotSetException,
    SomeTokensNotFoundException,
    TokenBalanceNotEnoughForWithdrawException,
    TokenNotFoundException
} from "@modules/exceptions"
import {
    BalanceFetcherService
} from "@modules/blockchains"
import {
    BalanceActionService,
} from "@modules/blockchains"
import {
    JobSchema
} from "@modules/databases"
import {
    WinstonLog,
    WinstonService
} from "@modules/winston"
import {
    Connection 
} from "mongoose"
import {
    AsyncService 
} from "@modules/mixin"
import {
    BalanceWithdrawTokenInput 
} from "@modules/blockchains"

@Injectable()
export class PrepareService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly winstonService: WinstonService,
        private readonly asyncService: AsyncService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {}

    // Phase: PREPARE
    // Responsibility:
    // - Ensure tokens are available (either from payload or fetched live)
    // - Compute withdraw plan (withdraw steps)
    // - Transition job state from PENDING → PREPARED
    // Notes:
    // - This phase must be idempotent
    // - Safe to re-enter on retry
    /**
     * PREPARE phase.
     *
     * Ensures balances are available (payload or live fetch), computes the reconcile
     * swap plan, pre-builds swap transactions, and persists a state transition:
     * PENDING → PREPARED (including `metadata.swapTransactions`).
     *
     * Idempotency: if the job is already at/after PREPARED, returns the previously
     * persisted metadata instead of recomputing.
     */
    async process({
        job,
        bot, 
        payload: {
            tokenInputs,
            toUsdc,
        }
    }: PrepareParams): Promise<PrepareResult> {
        // Guard: if job already passed PENDING phase, do nothing
        // This prevents duplicate preparation on retry or replay
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Prepared)
        ) {
            this.winstonService.log(
                WinstonLog.WithdrawJobAlreadyPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                }
            )
            return {
                result: job.data as ReconcileBalanceJobData
            }
        }
        if (!bot.withdrawalAddress) {
            throw new BotWithdrawalAddressNotSetException({
                botId: bot.id,
            })
        }
        const tokens = this.primaryMemoryStorageService.tokenCollection.find(
            {
                id: {
                    $in: tokenInputs.map((tokenInput) => tokenInput.tokenId)
                }
            }
        )
        if (tokens.length !== tokenInputs.length) {
            throw new SomeTokensNotFoundException(
                {
                    actualCount: tokens.length,
                    expectedCount: tokenInputs.length
                }
            )
        }
        const tokenBalances = await this.asyncService.allMustDone(
            tokens.map((token) => this.balanceFetcherService.fetchBalance({
                bot,
                token,
            }))
        )
        // we ensure the requested balance is not exceeded
        for (const tokenInput of tokenInputs) {
            const tokenBalance = tokenBalances[tokenInput.tokenId]
            if (tokenBalance.lt(tokenInput.amount)) {
                throw new TokenBalanceNotEnoughForWithdrawException(
                    {
                        id: tokenInput.tokenId,
                        amount: tokenInput.amount.toString(),
                        balance: tokenBalance.toString(),
                    }
                )
            }
        }
        // Convert tokenInputs from payload (with tokenId) to WithdrawTokenInput (with token)
        const withdrawTokenInputs: Array<BalanceWithdrawTokenInput> = tokenInputs.map((tokenInput) => {
            const token = tokens.find((token) => token.id.toString() === tokenInput.tokenId)
            if (!token) {
                throw new TokenNotFoundException({
                    id: tokenInput.tokenId,
                })
            }
            return {
                token,
                amount: tokenInput.amount,
                tokenId: token.id.toString(),
            }
        })

        // Prepare withdraw transactions
        // Note: toAddress and toUsdc should come from payload or config
        // For now, we'll use bot.accountAddress as default toAddress
        // and toUsdc as false (can be made configurable)
        const { prepareTxs } = await this.balanceActionService.prepareWithdrawTransaction({
            bot,
            tokenInputs: withdrawTokenInputs,
            toAddress: bot.withdrawalAddress,
            toUsdc,
        })
        // Persist job state transition:
        // PENDING → PREPARED
        // This marks preparation as completed and enables execution phase
        await this.connection
            .model<JobSchema>(JobSchema.name)
            .updateOne(
                {
                    _id: job.id 
                },
                {
                    $set: {
                        status: JobStatus.Prepared,
                        "data.prepareTxs": prepareTxs,
                    },
                }
            )
        this.winstonService.log(
            WinstonLog.SwapTransactionPrepared,
            {
                botId: bot.id,
                txHashes: prepareTxs.map((prepareTx) => prepareTx.txHash),
            }
        )
        // Return execution plan to next phase
        return {
            result: {
                prepareTxs
            }
        }
    }
}