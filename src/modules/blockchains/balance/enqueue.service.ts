import {
    Injectable
} from "@nestjs/common"
import {
    EnqueueBalanceRebalancingParams,
    DetermineReconcileBalancePlanParams,
    DetermineReconcileBalancePlanResult,
} from "./types"
import {
    TokenType
} from "@modules/typedefs"
import {
    BalanceFetcherService
} from "./fetcher.service"
import {
    JobType,
    JobStatus,
    PrimaryMemoryStorageService,
    InjectPrimaryMongoose,
    JobSchema,
    BotSchema,
} from "@modules/databases"
import {
    TokenNotFoundException,
} from "@modules/exceptions"
import {
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
    Job,
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
import {
    IBalanceEnqueueService
} from "./types"

@Injectable()
export class BalanceEnqueueService implements IBalanceEnqueueService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly balanceFetcherService: BalanceFetcherService,
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
    ): Promise<Job<string>> {
        /**
         * Add reconcile balance job to the queue
         */
        if (!isRetry) {
            const session = await this.connection.startSession()
            await session.withTransaction(
                async () => {
                    /**
                 * Persist job record.
                 */
                    const [jobRaw] = await this.connection.model<JobSchema>(
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
        return await this.reconcileBalanceQueue.add(
            v4(),
            this.superJson.stringify(
                payload
            ),
            {
                jobId: bot.id,
            }
        )
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
            } = await this.balanceFetcherService.fetchBalances(
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
}
