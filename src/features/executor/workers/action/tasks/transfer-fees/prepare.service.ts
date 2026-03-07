import {
    Injectable 
} from "@nestjs/common"
import {
    JobType, TaskType, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    BalanceActionService, BalanceFetcherService 
} from "@modules/blockchains"
import {
    TransferFeesTaskPrepareParams 
} from "../types"
import {
    SendHeartbeatService 
} from "../../send-heartbeat.service"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    JobFailureStrategy 
} from "@modules/common"
import {
    ActionJobTaskPrepareMaxAttemptsException,
    JobFailureException,
    TokenNotFoundException,
} from "@modules/exceptions"
import {
    JobTaskService 
} from "../../update"
import {
    envConfig 
} from "@modules/env"

@Injectable()
export class TransferFeesTaskPrepareService {
    constructor(
        private readonly balanceActionService: BalanceActionService,
        private readonly balanceFetcherService: BalanceFetcherService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly sendHeartbeatService: SendHeartbeatService,
        private readonly winstonService: WinstonService,
        private readonly jobTaskService: JobTaskService,
    ) {}

    async process({ bot, job, taskIndex, bullmqJob }: TransferFeesTaskPrepareParams) {
        try {
            await this.sendHeartbeatService.process({
                bot, job, bullmqJob 
            })

            const retries = job.tasks?.[taskIndex]?.retries ?? 0
            if (retries >= envConfig().executor.workers.job.prepareMaxAttempts) {
                throw new JobFailureException({
                    originalError: new ActionJobTaskPrepareMaxAttemptsException({
                        maxAttempts: envConfig().executor.workers.job.prepareMaxAttempts,
                        botId: bot.id,
                        jobId: job.id,
                        metadata: job.metadata,
                        type: TaskType.TransferFees,
                    }),
                    strategy: JobFailureStrategy.Fatal,
                })
            }

            const targetToken = this.primaryMemoryStorageService.tokenCollection.findOne({
                id: {
                    $eq: bot.targetToken.toString() 
                },
            })
            if (!targetToken) {
                throw new TokenNotFoundException({
                    id: bot.targetToken.toString() 
                })
            }

            const balanceResult = await this.balanceFetcherService.fetchBalance({
                bot,
                token: targetToken,
            })

            const prepareResult = await this.balanceActionService.prepareTransferFeesTransaction({
                bot,
                currentTargetBalanceAmount: balanceResult.balanceAmount,
            })

            await this.jobTaskService.upsertPreparedTask({
                jobId: job.id,
                taskType: TaskType.TransferFees,
                taskIndex,
                prepareResult,
            })

            this.winstonService.log(WinstonLog.ActiveJobTaskPrepared,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: job.type ?? JobType.OpenPosition,
                    txCount: prepareResult.prepareTxs.length,
                    metadata: job.metadata,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                })
        } catch (error) {
            this.winstonService.log(WinstonLog.ActiveJobTaskPreparedFailed,
                {
                    botId: bot.id,
                    jobId: job.id,
                    type: job.type ?? JobType.OpenPosition,
                    error: error.message,
                    taskIndex,
                    taskType: TaskType.TransferFees,
                    metadata: job.metadata,
                })
            throw new JobFailureException({
                originalError: error,
                strategy: JobFailureStrategy.Fatal,
            })
        }
    }
}
