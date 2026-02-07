import {
    Injectable 
} from "@nestjs/common"
import {
    PrepareParams,
    PrepareResult,
    WithdrawJobData,
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
    BalanceFetcherService,
    PrepareWithdrawTransactionResult
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
    AsyncService,
    InjectSuperJson,
} from "@modules/mixin"
import {
    DayjsService 
} from "@modules/mixin"
import {
    BalanceWithdrawTokenInput 
} from "@modules/blockchains"
import SuperJSON from "superjson"
import {
    ToStringObject 
} from "@modules/common"
import BN from "bn.js"
import {
    WithdrawJobPreparedFailedException,
} from "@modules/exceptions"
import {
    FatalError,
} from "../fatal"

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
        private readonly dayjsService: DayjsService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
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
            payload: cacheResult,
        }
    }: PrepareParams): Promise<PrepareResult> {
        // Guard: if job already passed PENDING phase, do nothing
        // This prevents duplicate preparation on retry or replay
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Prepared)
        ) {
            const { withdrawTransaction: stringifiedWithdrawTransaction } = job.data as ToStringObject<WithdrawJobData>
            const withdrawTransaction = this.superJson.parse<PrepareWithdrawTransactionResult>(stringifiedWithdrawTransaction)
            this.winstonService.log(
                WinstonLog.WithdrawJobAlreadyPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    ageMs: this.dayjsService.now().diff(job.createdAt,
                        "millisecond"),
                    txHashes: withdrawTransaction.prepareTxs.map((prepareTx) => prepareTx.txHash),
                }
            )
            return {
                result: {
                    withdrawTransaction,
                }
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
                    $in: cacheResult.tokenInputs.map((tokenInput) => tokenInput.tokenId)
                }
            }
        )
        if (tokens.length !== cacheResult.tokenInputs.length) {
            throw new SomeTokensNotFoundException(
                {
                    actualCount: tokens.length,
                    expectedCount: cacheResult.tokenInputs.length
                }
            )
        }
        const tokenBalances = await this.asyncService.allMustDone(
            tokens.map(async (token) => {
                const tokenBalance = await this.balanceFetcherService.fetchBalance({
                    bot,
                    token,
                })
                return [
                    token.id, 
                    tokenBalance.balanceAmount,
                ] as [string, BN]
            })
        ) 
        const tokenBalancesMap = new Map<string, BN>(tokenBalances)
        // we ensure the requested balance is not exceeded
        for (const tokenInput of cacheResult.tokenInputs) {
            const tokenBalance = tokenBalancesMap.get(tokenInput.tokenId)
            if (!tokenBalance) {
                throw new TokenNotFoundException({
                    id: tokenInput.tokenId,
                })
            }
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
        const withdrawTokenInputs: Array<BalanceWithdrawTokenInput> = cacheResult.tokenInputs.map(
            (tokenInput) => {
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
            }
        )
        // Prepare withdraw transactions
        // Note: toAddress and toUsdc should come from payload or config
        // For now, we'll use bot.accountAddress as default toAddress
        // and toUsdc as false (can be made configurable)
        const [
            withdrawTransaction,
            error
        ] = await this.asyncService.resolveTuple(
            this.balanceActionService.prepareWithdrawTransaction({
                bot,
                tokenInputs: withdrawTokenInputs,
                toAddress: bot.withdrawalAddress,
                toUsdc: cacheResult.toUsdc,
            })
        )
        if (error) {
            const failedError = new WithdrawJobPreparedFailedException({
                originalError: error,
                botId: bot.id,
                jobId: job.id,
            })
            // throw everything as a fatal error to stop the job
            throw new FatalError(failedError.toJSON())
        }
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
                        "data.withdrawTransaction": this.superJson.stringify(withdrawTransaction)
                    },
                }
            )
        this.winstonService.log(
            WinstonLog.WithdrawJobPrepared,
            {
                botId: bot.id,
                jobId: job.id,
                txHashes: withdrawTransaction.prepareTxs.map((prepareTx) => prepareTx.txHash),
            }
        )
        // Return execution plan to next phase
        return {
            result: {
                withdrawTransaction
            }
        }
    }
}