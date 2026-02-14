import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import {
    InjectPrimaryMongoose,
    JobSchema,
    JobType,
    StepType,
    TaskType,
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Connection 
} from "mongoose"
import {
    InjectSuperJson, AsyncService 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    BalanceFetcherService,
    BalanceActionService,
    BalanceWithdrawTokenInput,
} from "@modules/blockchains"
import {
    BotWithdrawalAddressNotSetException,
    JobFailureException,
    JobFailureStrategy,
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

/**
 * Service for the Withdraw Task PREPARE step.
 */
@Injectable()
export class WithdrawTaskPrepareService {
    constructor(
    private readonly balanceActionService: BalanceActionService,
    private readonly balanceFetcherService: BalanceFetcherService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly asyncService: AsyncService,
    private readonly sendHeartbeatService: SendHeartbeatService,
    private readonly winstonService: WinstonService,
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    @InjectSuperJson()
    private readonly superJson: SuperJSON,
    private readonly cacheService: CacheService,
    ) {}

    /**
   * Process the Withdraw Task PREPARE step.
   */
    async process({
        bot,
        job,
        taskIndex,
        bullmqJob,
    }: WithdrawTaskPrepareParams) {
        // Heartbeat
        await this.sendHeartbeatService.process({
            bot, job, bullmqJob 
        })
        // cache result
        const cacheResult = await this.cacheService.get(
            {
                key: CacheKey.Withdraw,
                args: [bot.id],
            }
        )
        // job failure
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

        // tokens
        const tokenIds = cacheResult.tokenInputs.map((tokenInput) => tokenInput.tokenId)
        const tokens = this.primaryMemoryStorageService.tokenCollection.find(
            {
                id: {
                    $in: tokenIds 
                },
            }
        )
        // some tokens not found
        if (tokens.length !== cacheResult.tokenInputs.length) {
            throw new JobFailureException({
                originalError: new SomeTokensNotFoundException({
                    actualCount: tokens.length,
                    expectedCount: cacheResult.tokenInputs.length,
                }),
                strategy: JobFailureStrategy.Fatal,
            })
        }
        // token balances
        const tokenBalances = await this.asyncService.allMustDone(
            tokens.map(async (token) => {
                const tokenBalance = await this.balanceFetcherService.fetchBalance({
                    bot,
                    token,
                })
                return [token.id,
                    tokenBalance.balanceAmount] as [string, BN]
            }),
        )
        // token balances map
        const tokenBalancesMap = new Map<string, BN>(tokenBalances)
        // token balances not enough
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

        // 4) Convert inputs -> BalanceWithdrawTokenInput
        const withdrawTokenInputs: Array<BalanceWithdrawTokenInput> = cacheResult.tokenInputs.map(
            (tokenInput: { tokenId: string; amount: BN }) => {
                const token = tokens.find((t) => t.id.toString() === tokenInput.tokenId)
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
            },
        )

        // prepare withdraw transactions
        const [prepareResult,
            error] = await this.asyncService.resolveTuple(
            this.balanceActionService.prepareWithdrawTransaction({
                bot,
                tokenInputs: withdrawTokenInputs,
                toAddress: bot.withdrawalAddress,
                toUsdc: cacheResult.toUsdc,
            }),
        )
        // prepare withdraw transactions error  
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
        // persist as task + steps
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
            {
                _id: job.id 
            },
            {
                $push: {
                    tasks: {
                        index: taskIndex,
                        type: TaskType.Withdraw,
                        prepareResult: this.superJson.stringify(prepareResult),
                        activeStep: 0,
                        stepCount: prepareResult.prepareTxs.length,
                        steps: prepareResult.prepareTxs.map((prepareTx, index) => ({
                            index,
                            type: StepType.Sign,
                            prepareTx: this.superJson.stringify(prepareTx),
                        })),
                    },
                },
            },
        )

        this.winstonService.log(
            WinstonLog.ActiveJobPrepared,
            {
                botId: bot.id,
                jobId: job.id,
                type: JobType.Withdraw,
                txCount: prepareResult.prepareTxs.length,
                metadata: job.metadata,
            }
        )
    }
}