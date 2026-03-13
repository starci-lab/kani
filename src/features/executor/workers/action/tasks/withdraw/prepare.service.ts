import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import {
    JobType,
    TaskType,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    AsyncService 
} from "@modules/mixin"
import {
    BalanceFetcherService,
    BalanceActionService,
    BalanceWithdrawTokenInput,
} from "@modules/blockchains"
import {
    ActionJobTaskPrepareMaxAttemptsException,
    BotWithdrawalAddressNotSetException,
    JobFailureException,
    PrepareWithdrawTransactionResultNotFoundException,
    SomeTokensNotFoundException,
    TokenBalanceNotEnoughForWithdrawException,
    TokenNotFoundException,
    WithdrawCacheResultNotFoundException,
} from "@modules/exceptions"
import {
    SendHeartbeatService 
} from "../../send-heartbeat.service"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    WithdrawTaskPrepareParams 
} from "../types"
import {
    CacheKey, CacheService 
} from "@modules/cache"
import {
    JobFailureStrategy 
} from "@modules/common"
import {
    JobTaskService 
} from "../../update"
import {
    envConfig 
} from "@modules/env"

@Injectable()
export class WithdrawTaskPrepareService {
    constructor(
    private readonly balanceActionService: BalanceActionService,
    private readonly balanceFetcherService: BalanceFetcherService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly asyncService: AsyncService,
    private readonly sendHeartbeatService: SendHeartbeatService,
    private readonly winstonService: WinstonService,
    private readonly cacheService: CacheService,
    private readonly jobTaskService: JobTaskService,
    ) {}

    /**
   * Process the Withdraw Task PREPARE step.
   */
    async process({ bot, job, taskIndex, bullmqJob }: WithdrawTaskPrepareParams) {
        try {
            // heartbeat
            await this.sendHeartbeatService.process({
                bot, job, bullmqJob 
            })

            // max-attempt guard
            const retries = job.tasks?.[taskIndex]?.retries ?? 0
            const maxAttempts = envConfig().executor.workers.job.prepareMaxAttempts
            if (retries >= maxAttempts) {
                throw new JobFailureException({
                    originalError: new ActionJobTaskPrepareMaxAttemptsException({
                        maxAttempts,
                        botId: bot.id,
                        jobId: job.id,
                        metadata: job.metadata,
                        type: TaskType.Withdraw,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }

            // cache result
            const cacheResult = await this.cacheService.get({
                key: CacheKey.Withdraw,
                args: [bot.id],
            })
            if (!cacheResult) {
                throw new JobFailureException({
                    originalError: new WithdrawCacheResultNotFoundException({
                        botId: bot.id,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }
            // withdrawal address
            if (!bot.withdrawalAddress) {
                throw new JobFailureException({
                    originalError: new BotWithdrawalAddressNotSetException({
                        botId: bot.id,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }

            // resolve tokens
            const tokenIds = cacheResult.tokenInputs.map(
                (tokenInput) => tokenInput.tokenId,
            )

            const tokens = Array.from(this.primaryMemoryStorageService.tokenMap.values()).filter(
                (t) => tokenIds.includes(t.id),
            )

            if (tokens.length !== cacheResult.tokenInputs.length) {
                throw new JobFailureException({
                    originalError: new SomeTokensNotFoundException({
                        actualCount: tokens.length,
                        expectedCount: cacheResult.tokenInputs.length,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }

            // fetch balances for tokens
            const tokenBalances = await this.asyncService.allMustDone(
                tokens.map(async (token) => {
                    const tokenBalance = await this.balanceFetcherService.fetchBalance(
                        {
                            bot,
                            token,
                        }
                    )
                    return [token.id,
                        tokenBalance.balanceAmount] as [string, BN]
                }),
            )
            const tokenBalancesMap = new Map<string, BN>(tokenBalances)

            // validate balance >= requested withdraw
            for (const tokenInput of cacheResult.tokenInputs) {
                const tokenBalance = tokenBalancesMap.get(tokenInput.tokenId)

                if (!tokenBalance) {
                    throw new JobFailureException({
                        originalError: new TokenNotFoundException({
                            id: tokenInput.tokenId,
                        }),
                        strategy: JobFailureStrategy.Fatal,
                    })
                }
                if (tokenBalance.lt(tokenInput.amount)) {
                    throw new JobFailureException({
                        originalError: new TokenBalanceNotEnoughForWithdrawException({
                            id: tokenInput.tokenId,
                            amount: tokenInput.amount.toString(),
                            balance: tokenBalance.toString(),
                        }),
                        strategy: JobFailureStrategy.Fatal,
                    })
                }
            }

            // convert inputs -> BalanceWithdrawTokenInput
            const withdrawTokenInputs: Array<BalanceWithdrawTokenInput> = (
                cacheResult.tokenInputs
            ).map((tokenInput) => {
                const token = tokens.find(
                    (token) => token.id.toString() === tokenInput.tokenId,
                )
                if (!token) {
                    throw new JobFailureException({
                        originalError: new TokenNotFoundException({
                            id: tokenInput.tokenId,
                        }),
                        strategy: JobFailureStrategy.Fatal,
                    })
                }
                return {
                    token,
                    amount: tokenInput.amount,
                    tokenId: token.id.toString(),
                }
            })
            // prepare withdraw transactions
            const [
                prepareResult,
                error
            ] = await this.asyncService.resolveTuple(
                this.balanceActionService.prepareWithdrawTransaction({
                    bot,
                    tokenInputs: withdrawTokenInputs,
                    toAddress: bot.withdrawalAddress,
                    toUsdc: cacheResult.toUsdc,
                }),
            )
            if (error) {
                throw new JobFailureException({
                    originalError: error,
                    strategy: JobFailureStrategy.Fatal,
                })
            }
            if (!prepareResult) {
                throw new JobFailureException({
                    originalError: new PrepareWithdrawTransactionResultNotFoundException({
                        botId: bot.id,
                        jobId: job.id,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }

            await this.jobTaskService.upsertPreparedTask(
                {
                    jobId: job.id,
                    taskType: TaskType.Withdraw,
                    taskIndex,
                    prepareResult,
                }
            )

            // log prepared task
            this.winstonService.log(WinstonLog.ActiveJobTaskPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.Withdraw,
                    txCount: prepareResult.prepareTxs.length,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.Withdraw,
                })
        } catch (error) {
            this.winstonService.log(WinstonLog.ActiveJobTaskPreparedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.Withdraw,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.Withdraw,
                    metadata: job.metadata,
                })

            throw new JobFailureException({
                originalError: error,
                strategy: JobFailureStrategy.Fatal,
            })
        }
    }
}