import {
    Injectable 
} from "@nestjs/common"
import {
    FetchBalanceParams,
    FetchBalanceResult,
    FetchBalancesParams,
    FetchBalancesResult,
    IBalanceService,
    PrepareSwapTransactionParams,
    PrepareSwapTransactionResult,
    ExecuteSwapTransactionParams,
    EnqueueBalanceRebalancingParams,
    DetermineReconcileBalancePlanParams,
    DetermineReconcileBalancePlanResult,
} from "./balance.interface"
import {
    SolanaBalanceService 
} from "./solana.service"
import {
    TokenType, ChainId 
} from "@modules/typedefs"
import {
    SuiBalanceService 
} from "./sui.service"
import { 
    JobType, 
    JobStatus, 
    PrimaryMemoryStorageService, 
    InjectPrimaryMongoose, 
    JobSchema,
    BotSchema, 
} from "@modules/databases"
import {
    TargetOperationalGasAmountNotFoundException,
    TokenNotFoundException,
    MinOperationalGasAmountNotFoundException,
    UnsupportedChainIdException,
    InsufficientMinGasBalanceAmountException,
} from "@modules/exceptions"
import {
    GasStatusService 
} from "./gas-status.service"
import {
    GasStatus, 
    ReconcileBalancePayload
} from "../types"
import BN from "bn.js"
import {
    SwapMathService 
} from "../math"
import {
    envConfig 
} from "@modules/env"
import {
    Connection 
} from "mongoose"
import {
    Queue 
} from "bullmq"
import {
    bullData, BullQueueName 
} from "@modules/bullmq"
import {
    InjectQueue 
} from "@nestjs/bullmq"
import {
    InjectSuperJson 
} from "@modules/mixin"
import SuperJSON from "superjson"
import {
    DayjsService 
} from "@modules/mixin"
import {
    v4 
} from "uuid"

@Injectable()
export class BalanceService implements IBalanceService {
    constructor(
    private readonly solanaBalanceService: SolanaBalanceService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly suiBalanceService: SuiBalanceService,
    private readonly gasStatusService: GasStatusService,
    private readonly swapMathService: SwapMathService,
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    @InjectQueue(bullData[BullQueueName.ReconcileBalance].name)
    private readonly reconcileBalanceQueue: Queue<string>,
    @InjectSuperJson()
    private readonly superJson: SuperJSON,
    private readonly dayjsService: DayjsService,
    ) {
    }

    async enqueue(
        {
            bot,
            jobId,
            isRetry,
        }: EnqueueBalanceRebalancingParams,
    ) {
        /**
         * Safety check, if the active position is set, return only
         */
        if (
            bot.activePosition
        ) {
            return null
        }
        /**
         * Add reconcile balance job to the queue
         */
        if (!isRetry) {
            const session = await this.connection.startSession()
            return await session.withTransaction(
                async () => {
                /**
                * Persist job record.
                */
                    const [ jobRaw ] = await this.connection.model<JobSchema>(
                        JobSchema.name
                    ).create(
                        [
                            {
                                _id: jobId,
                                bot: bot.id,
                                type: JobType.ReconcileBalance,
                                status: JobStatus.Pending,
                                executor: envConfig().executor.id,
                                startedAt: this.dayjsService.now().toDate(),
                            }
                        ],
                        {
                            session 
                        })
                    const job = jobRaw.toJSON<JobSchema>()
                    /**
                    * Update the bot with the active job id.
                    */
                    await this.connection.model<BotSchema>(BotSchema.name)
                        .updateOne(
                            {
                                _id: bot.id 
                            },
                            {
                                $set: {
                                    activeJob: {
                                        job: job.id,
                                        queuedAt: this.dayjsService.now().toDate(),
                                        jobType: JobType.ReconcileBalance,
                                    },
                                } 
                            },
                            {
                                session 
                            }
                        )
                }
            )   
        }
        /**
        * Enqueue reconcile balance job.
        */
        const payload: ReconcileBalancePayload = {
            jobId,
            botId: bot.id,
            isRetry,
        }
        const bullmqJob = await this.reconcileBalanceQueue.add(
            v4(),
            this.superJson.stringify(
                payload
            ),
            {
                jobId: bot.id,
            }
        )
        return bullmqJob
    }   

    async determineReconcileBalancePlan({
        bot,
        targetBalanceAmount: _targetBalanceAmount,
        quoteBalanceAmount: _quoteBalanceAmount,
        gasBalanceAmount: _gasBalanceAmount,
    }: DetermineReconcileBalancePlanParams): Promise<DetermineReconcileBalancePlanResult> {
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.targetToken.toString()
            }
        })
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString(),
            })
        }   
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.quoteToken.toString()
            }
        })
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString(),
            })
        }   
        const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            type: {
                $eq: TokenType.Native
            },
            chainId: {
                $eq: bot.chainId
            }
        })
        if (!gasToken) {
            throw new TokenNotFoundException({
                conditions: {
                    chainId: bot.chainId,
                    type: TokenType.Native,
                },
            })
        }
        // if you pass the snapshot balances, we will use them instead of fetching the balances from on-chain
        let targetBalanceAmount: BN
        let quoteBalanceAmount: BN
        let gasBalanceAmount: BN
        if (
            _targetBalanceAmount &&
            _quoteBalanceAmount &&
            _gasBalanceAmount
        ) {
            targetBalanceAmount = _targetBalanceAmount
            quoteBalanceAmount = _quoteBalanceAmount
            gasBalanceAmount = _gasBalanceAmount
        } else {
            const {
                targetBalanceAmount: _targetBalanceAmount,
                quoteBalanceAmount: _quoteBalanceAmount,
                gasBalanceAmount: _gasBalanceAmount,
            } = await this.fetchBalances(
                {
                    bot,
                }
            )
            targetBalanceAmount = _targetBalanceAmount
            quoteBalanceAmount = _quoteBalanceAmount
            gasBalanceAmount = _gasBalanceAmount
        }
        return await this.swapMathService.computeSwapAmounts(
            {
                targetToken,
                quoteToken,
                gasToken,
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount
            }
        )
    }

    async prepareSwapTransaction(
        params: PrepareSwapTransactionParams,
    ): Promise<PrepareSwapTransactionResult> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.prepareSwapTransaction(params)
        case ChainId.Sui:
            return this.suiBalanceService.prepareSwapTransaction(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }

    async executeSwapTransaction(
        params: ExecuteSwapTransactionParams,
    ): Promise<void> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.executeSwapTransaction(params)
        case ChainId.Sui:
            return this.suiBalanceService.executeSwapTransaction(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }

    public async fetchBalances(
        {
            bot,
        }: FetchBalancesParams
    ): Promise<FetchBalancesResult> {
        const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.targetToken.toString()
            }
        })
        if (!targetToken) {
            throw new TokenNotFoundException({
                id: bot.targetToken.toString(),
            })
        }
        const quoteToken = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: bot.quoteToken.toString()
            }
        })
        if (!quoteToken) {
            throw new TokenNotFoundException({
                id: bot.quoteToken.toString(),
            })
        }
        const { balanceAmount: targetBalanceAmount } = await this.fetchBalance({
            bot,
            token: targetToken,
        })
        const { balanceAmount: quoteBalanceAmount } = await this.fetchBalance({
            bot,
            token: quoteToken,
        })
        const gasStatus = this.gasStatusService.getGasStatus({
            targetTokenId: targetToken.displayId,
            quoteTokenId: quoteToken.displayId,
        })
        const targetOperationalGasAmount =
      this.primaryMemoryStorageService.gasConfig.gasAmountRequired?.[bot.chainId]
          ?.targetOperationalAmount
        if (!targetOperationalGasAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                {
                    chainId: bot.chainId,
                }
            )
        }
        const minOperationalGasAmount =
      this.primaryMemoryStorageService.gasConfig.gasAmountRequired?.[bot.chainId]
          ?.minOperationalAmount
        if (!minOperationalGasAmount) {
            throw new MinOperationalGasAmountNotFoundException(
                {
                    chainId: bot.chainId,
                }
            )
        }
        const targetOperationalGasAmountBN = new BN(targetOperationalGasAmount)
        const minOperationalGasAmountBN = new BN(minOperationalGasAmount)
        switch (gasStatus) {
        case GasStatus.IsTarget: {
        // we use the possible maximum amount of gas that can be used
            const effectiveGasAmountBN = BN.min(
                targetOperationalGasAmountBN,
                targetBalanceAmount,
            )
            if (effectiveGasAmountBN.lt(minOperationalGasAmountBN)) {
                throw new InsufficientMinGasBalanceAmountException(
                    {
                        gasBalanceAmount: effectiveGasAmountBN.toString(),
                        minOperationalGasAmount: minOperationalGasAmountBN.toString(),
                        chainId: bot.chainId,
                        botId: bot.id,
                    }
                )
            }
            const targetBalanceAmountAfterDeductingGas =
          targetBalanceAmount.sub(effectiveGasAmountBN)
            return {
                targetBalanceAmount: targetBalanceAmountAfterDeductingGas,
                quoteBalanceAmount,
                gasBalanceAmount: effectiveGasAmountBN,
            }
        }
        case GasStatus.IsQuote: {
            const quoteBalanceAmountAfterDeductingGas = quoteBalanceAmount.sub(
                targetOperationalGasAmountBN,
            )
            return {
                targetBalanceAmount,
                quoteBalanceAmount: quoteBalanceAmountAfterDeductingGas,
                gasBalanceAmount: targetOperationalGasAmountBN,
            }
        }
        default: {
            const gasToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                type: {
                    $eq: TokenType.Native
                },
                chainId: {
                    $eq: bot.chainId
                }
            })
            if (!gasToken) {
                throw new TokenNotFoundException({
                    conditions: {
                        chainId: bot.chainId,
                        type: TokenType.Native,
                    },
                })
            }
            const { balanceAmount: gasBalanceAmount } = await this.fetchBalance({
                bot,
                token: gasToken,
            })
            return {
                targetBalanceAmount,
                quoteBalanceAmount,
                gasBalanceAmount,
            }
        }
        }
    }

    public async fetchBalance(
        params: FetchBalanceParams,
    ): Promise<FetchBalanceResult> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.fetchBalance(params)
        case ChainId.Sui:
            return this.suiBalanceService.fetchBalance(params)
        default:
            throw new UnsupportedChainIdException(
                params.bot.chainId,
            )
        }
    }
}
