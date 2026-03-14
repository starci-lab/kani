import {
    Injectable, OnModuleInit
} from "@nestjs/common"
import {
    WithdrawTaskConfirmParams
} from "../types"
import {
    WinstonService, WinstonLog
} from "@modules/winston"
import {
    InjectPrimaryMongoose,
    JobSchema,
    JobType,
    PrimaryMemoryStorageService,
    TaskType
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    envConfig
} from "@modules/env"
import {
    ActionJobStimulateMongoSessionException,
    TokenNotFoundException
} from "@modules/exceptions"
import {
    SendHeartbeatService
} from "../../send-heartbeat.service"
import {
    strict as assert,
} from "node:assert"
import {
    DebugContextService,
} from "../debug-context.service"
import {
    DebugLatencyService,
} from "@modules/debug"
import {
    AxiosService,
} from "@modules/axios"
import {
    AxiosInstance,
    AxiosResponse
} from "axios"
import {
    buildInterfaceFullEndpointPath,
    interfaceRestConfig
} from "@modules/service-configs"
import type {
    ConfirmWithdrawalRequestDto
} from "@features/interface"
import {
    SuperJSON 
} from "superjson"
import {
    InjectSuperJson
} from "@modules/mixin"
import {
    BalanceFetcherService,
    ExecuteWithdrawTransactionResult, 
    PrepareWithdrawTransactionResult 
} from "@modules/blockchains"
import {
    AsyncService 
} from "@modules/mixin"
/**
 * Service to process the WITHDRAW TASK CONFIRM step.
 */
@Injectable()
export class WithdrawTaskConfirmService implements OnModuleInit {
    private axiosInstance: AxiosInstance
    /**
     * Constructor for the WithdrawTaskConfirmService.
     * @param winstonService - The Winston service for logging.
     * @param connection - The connection to the MongoDB database.
     * @param sendHeartbeatService - The service to send heartbeat to the bot.
     * @param axiosService - The Axios service for making HTTP requests.
     */
    constructor(
        private readonly winstonService: WinstonService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly axiosService: AxiosService,
        private readonly asyncService: AsyncService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly debugContextService: DebugContextService,
        private readonly debugLatencyService: DebugLatencyService,
    ) {}
    /**
     * Initialize the Axios instance for the interface.
     */
    onModuleInit() {
        this.axiosInstance = this.axiosService.create(
            {
                key: "interface"
            }
        )
    }
    /**
     * Process the WITHDRAW TASK CONFIRM step.
     */
    async process(
        {
            bot,
            job,
            taskIndex,
            bullmqJob
        }: WithdrawTaskConfirmParams
    ) {
        const contextPayload = this.debugContextService.createContextPayload({
            jobType: JobType.Withdraw,
            jobId: job.id,
            botId: bot.id,
        })
        try {
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
            })
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Heartbeat sent successfully",
            })
            try {
                const session = await this.connection.startSession()
                await session.withTransaction(async (clientSession) => {
                    const updateJobResult =
                        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
                            {
                                _id: job.id,
                            },
                            {
                                $set: {
                                    "tasks.$[task].confirmed": true,
                                },
                                $inc: {
                                    taskIndex: 1,
                                },
                            },
                            {
                                arrayFilters: [
                                    {
                                        "task.index": taskIndex,
                                        "task.type": TaskType.Withdraw,
                                    },
                                ],
                                session: clientSession,
                            },
                        )

                    assert(updateJobResult.matchedCount > 0)

                    // stimulate mongo session if enabled
                    if (envConfig().executor.runtime.operation.withdraw.stimulate) {
                        throw new ActionJobStimulateMongoSessionException({
                            botId: bot.id,
                            jobId: job.id,
                            taskIndex,
                        })
                    }
                })
            } catch (error) {
                if (!(error instanceof ActionJobStimulateMongoSessionException)) {
                    throw error
                }
            }
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Confirm transaction successfully",
            })
            this.winstonService.log(
                WinstonLog.ActionJobTaskConfirmed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.Withdraw,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.Withdraw,
                }
            )
            const prepareResult = this.superJson.parse<PrepareWithdrawTransactionResult>(job.tasks[taskIndex].prepareResult ?? "")
            const tokenOutputs = prepareResult.tokenOutputs
            const tokenOutputSnapshots = prepareResult.tokenOutputSnapshots
            const afterTokenOutputSnapshots = await this.asyncService.allMustDone(
                tokenOutputSnapshots.map(async (tokenOutputSnapshot) => {
                    const token = this.primaryMemoryStorageService.tokenMap.get(tokenOutputSnapshot.tokenId)
                    if (!token) {
                        throw new TokenNotFoundException({
                            id: tokenOutputSnapshot.tokenId,
                        })
                    }
                    const balance = await this.balanceFetcherService.fetchBalance({
                        bot,
                        token,
                    })
                    return {
                        tokenId: tokenOutputSnapshot.tokenId,
                        amount: balance.balanceAmount,
                    }
                }),
            )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Fetch balances after withdraw successfully",
            })
            const receivedTokens = afterTokenOutputSnapshots.map((afterTokenOutputSnapshot) => {
                const tokenOutputSnapshot = tokenOutputs.find((tokenOutput) => tokenOutput.tokenId === afterTokenOutputSnapshot.tokenId)
                if (!tokenOutputSnapshot) {
                    throw new TokenNotFoundException({
                        id: afterTokenOutputSnapshot.tokenId,
                    })
                }
                const amountDiff = afterTokenOutputSnapshot.amount.sub(tokenOutputSnapshot.amount)
                return {
                    id: tokenOutputSnapshot.tokenId,
                    amount: amountDiff.toString(),
                }
            })
            const txHashes = job.tasks[taskIndex]
                .steps
                .map((step) => this.superJson.parse<ExecuteWithdrawTransactionResult>(step.executeResult ?? ""))
                .map((executeResult) => executeResult?.txHash
                )
            await this.axiosInstance.post<
                undefined,
                AxiosResponse<undefined>,
                ConfirmWithdrawalRequestDto>(
                    buildInterfaceFullEndpointPath({
                        tags: interfaceRestConfig().callback().tags,
                        api: interfaceRestConfig().callback().api().confirmWithdrawal.path,
                    }),
                    {
                        botId: bot.id,
                        txHashes,
                        receivedTokens,
                    },
                )
            this.debugLatencyService.measure({
                id: contextPayload.id,
                description: "Confirm withdrawal callback successfully",
            })
        } catch (error) {
            this.winstonService.log(
                WinstonLog.ActionJobTaskConfirmedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: JobType.Withdraw,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.Withdraw,
                    metadata: job.metadata,
                }
            )

            throw error
        }
    }
}