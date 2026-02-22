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
    TaskType
} from "@modules/databases"
import {
    Connection
} from "mongoose"
import {
    envConfig
} from "@modules/env"
import {
    ActionJobStimulateMongoSessionException
} from "@modules/exceptions"
import {
    SendHeartbeatService
} from "../../send-heartbeat.service"
import {
    strict as assert
} from "node:assert"
import {
    AxiosService 
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
      private readonly sendHeartbeatService: SendHeartbeatService,
      private readonly axiosService: AxiosService,
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
        try {
        // 1) heartbeat
            await this.sendHeartbeatService.process({
                bot,
                job,
                bullmqJob,
            })
  
            // 2) transactional update
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
  
            // 3) log confirmed
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
            // call api to the interface to confirm the withdraw
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
                    txHashes: [],
                    receivedTokens: [],
                }
            )
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