import {
    Injectable,
} from "@nestjs/common"
import type {
    PrepareParams,
    PrepareResult,
    WithdrawJobData,
} from "./types"
import {
    getJobStatusOrder,
    InjectPrimaryMongoose,
    JobSchema,
    JobStatus,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    BotWithdrawalAddressNotSetException,
    JobFailureException,
    JobFailureStrategy,
    PrepareWithdrawTransactionResultNotFoundException,
    SomeTokensNotFoundException,
    TokenBalanceNotEnoughForWithdrawException,
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    BalanceFetcherService,
} from "@modules/blockchains"
import {
    BalanceActionService,
    BalanceWithdrawTokenInput,
} from "@modules/blockchains"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    Connection,
} from "mongoose"
import {
    DayjsService,
    AsyncService,
} from "@modules/mixin"
import {
    SerializerService,
    SendHeartbeatService,
} from "../common"
import {
    ToStringObject,
} from "@modules/common"
import BN from "bn.js"

/**
 * Service for the PREPARE phase of withdraw jobs.
 *
 * @example
 * const result = await prepareService.process({ job, bot, payload })
 */
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
        private readonly serializerService: SerializerService,
        private readonly sendHeartbeatService: SendHeartbeatService,
    ) {}

    /**
     * PREPARE phase: ensures tokens, validates balances, prepares withdraw transactions.
     *
     * @param params - Prepare params (job, bot, payload)
     * @returns Prepare result with withdrawTransaction data
     *
     * @example
     * const result = await prepareService.process({ job, bot, payload })
     */
    async process(params: PrepareParams): Promise<PrepareResult> {
        const { job, bot, payload: { payload: cacheResult } } = params
        // guard: idempotency (return persisted data if already prepared)
        if (
            getJobStatusOrder(job.status) >= getJobStatusOrder(JobStatus.Prepared)
        ) {
            const jobData = this.serializerService.deserialize<WithdrawJobData>(
                job.data as Partial<ToStringObject<WithdrawJobData>>
            )
            this.winstonService.log(
                WinstonLog.WithdrawJobAlreadyPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    ageMs: this.dayjsService.now().diff(job.createdAt,
                        "millisecond"),
                    txHashes: jobData?.prepareResult?.prepareTxs?.map((prepareTx) => prepareTx.txHash) ?? [],
                }
            )
            return {
                data: jobData,
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
                    $in: cacheResult.tokenInputs.map((tokenInput) => tokenInput.tokenId),
                },
            }
        )
        if (tokens.length !== cacheResult.tokenInputs.length) {
            throw new SomeTokensNotFoundException(
                {
                    actualCount: tokens.length,
                    expectedCount: cacheResult.tokenInputs.length,
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
        // ensure requested balance is not exceeded
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
        // convert tokenInputs from payload to WithdrawTokenInput
        const withdrawTokenInputs: Array<BalanceWithdrawTokenInput> = cacheResult.tokenInputs.map(
            (tokenInput) => {
                const token = tokens.find((t) => t.id.toString() === tokenInput.tokenId)
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
        const [
            prepareResult,
            error,
        ] = await this.asyncService.resolveTuple(
            this.balanceActionService.prepareWithdrawTransaction({
                bot,
                tokenInputs: withdrawTokenInputs,
                toAddress: bot.withdrawalAddress,
                toUsdc: cacheResult.toUsdc,
            })
        )
        if (error) {
            throw new JobFailureException({
                originalError: error,
                strategy: JobFailureStrategy.Fatal,
            })
        }
        if (!prepareResult) {
            throw new PrepareWithdrawTransactionResultNotFoundException({
                botId: bot.id,
                jobId: job.id,
            })
        }
        // persist job: PENDING → PREPARED
        const data = this.serializerService.serialize<Partial<WithdrawJobData>>({
            prepareResult
        })
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: {
                    $eq: job._id,
                },
            },
            {
                $set: {
                    status: JobStatus.Prepared,
                    ...data,
                },
            }
        )
        this.winstonService.log(
            WinstonLog.WithdrawJobPrepared,
            {
                botId: bot.id,
                jobId: job.id,
                txHashes: prepareResult.prepareTxs.map((prepareTx) => prepareTx.txHash),
            }
        )
        await this.sendHeartbeatService.process({
            ...params,
            fatal: true,
        })
        return {
            data: {
                prepareResult,
            },
        }
    }
}
