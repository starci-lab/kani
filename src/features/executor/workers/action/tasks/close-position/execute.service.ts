import { Injectable } from "@nestjs/common"
import { ClosePositionActionService, SignedTx } from "@modules/blockchains"
import {
  InjectPrimaryMongoose,
  JobSchema,
  StepType,
  TaskType,
} from "@modules/databases"
import { Connection } from "mongoose"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { ClosePositionTaskExecuteParams } from "../types"
import { SendHeartbeatService } from "../../send-heartbeat.service"
import {
  JobFailureException,
  JobFailureStrategy,
  RpcClientFatalException,
  SignedTxNotFoundException,
  ActionJobTaskTxSendMaxAttemptsException,
} from "@modules/exceptions"
import { envConfig } from "@modules/env"

/**
 * Service for the Close Position Task EXECUTE step.
 */
@Injectable()
export class ClosePositionTaskExecuteService {
  constructor(
    private readonly closePositionActionService: ClosePositionActionService,
    @InjectPrimaryMongoose()
    private readonly connection: Connection,
    @InjectSuperJson()
    private readonly superJson: SuperJSON,
    private readonly sendHeartbeatService: SendHeartbeatService,
  ) {}

  /**
   * Process the CLOSE POSITION TASK EXECUTE step.
   */
  async process({
    bot,
    job,
    liquidityPool,
    state,
    isRetry,
    bullmqJob,
    taskIndex,
  }: ClosePositionTaskExecuteParams) {
    // previous attempts from BullMQ
    const hasPreviousAttempts = bullmqJob.attemptsMade > 0

    // active step index
    const stepIndex = job.tasks[taskIndex].activeStep ?? 0

    // step snapshot (may be undefined)
    const step = job.tasks[taskIndex].steps?.[stepIndex]

    try {
      // heartbeat
      await this.sendHeartbeatService.process({
        bot,
        job,
        bullmqJob,
      })

      // signed tx
      const signedTx = step?.signedTx
      if (!signedTx) {
        throw new JobFailureException({
          originalError: new SignedTxNotFoundException({
            botId: bot.id,
            jobId: job.id,
            liquidityPoolId: liquidityPool.displayId,
            taskIndex,
            stepIndex,
          }),
          strategy: JobFailureStrategy.Fatal,
        })
      }

      // execute
      const executeResult = await this.closePositionActionService.execute({
        bot,
        state,
        txCheck: (hasPreviousAttempts || isRetry) ?? false,
        liquidityPool,
        signedTx: this.superJson.parse<SignedTx>(signedTx),
        stimulate: envConfig().executor.runtime.operation.closePosition.stimulate,
      })

      // persist execute result + move next step
      await this.connection.model<JobSchema>(JobSchema.name).updateOne(
        { _id: job.id },
        {
          $set: {
            "tasks.$[task].steps.$[step].executeResult":
              this.superJson.stringify(executeResult),
            "tasks.$[task].steps.$[step].type": StepType.Execute,
          },
          $inc: {
            "tasks.$[task].activeStep": 1,
          },
        },
        {
          arrayFilters: [
            {
              "task.index": taskIndex,
              "task.type": TaskType.ClosePosition,
            },
            {
              "step.index": stepIndex,
            },
          ],
        },
      )
    } catch (error) {
      if (error instanceof RpcClientFatalException) {
        // retry cap (use in-memory snapshot)
        const txFailureIndex = step?.txFailureIndex ?? 0
        const maxAttempts = envConfig().executor.workers.job.txSendMaxAttempts

        if (txFailureIndex >= maxAttempts) {
          throw new JobFailureException({
            originalError: new ActionJobTaskTxSendMaxAttemptsException({
              maxAttempts,
              originalError: error,
              botId: bot.id,
              jobId: job.id,
              liquidityPoolId: liquidityPool.displayId,
              metadata: job.metadata,
              type: TaskType.ClosePosition,
            }),
            strategy: JobFailureStrategy.Requeue,
          })
        }

        // rollback to Sign + log failure + increment counter atomically (pipeline update)
        await this.connection.model<JobSchema>(JobSchema.name).updateOne(
          { _id: job.id },
          [
            {
              $set: {
                "tasks.$[task].steps.$[step].type": StepType.Sign,

                // push failure record with ZERO-BASED index
                "tasks.$[task].steps.$[step].txFailures": {
                  $concatArrays: [
                    {
                      $ifNull: [
                        "tasks.$[task].steps.$[step].txFailures",
                        [],
                      ],
                    },
                    [
                      {
                        index: {
                          $ifNull: [
                            "tasks.$[task].steps.$[step].txFailureIndex",
                            0,
                          ],
                        },
                        errorMessage: error.message,
                        stackTrace: error.stack,
                      },
                    ],
                  ],
                },

                // increment counter AFTER logging
                "tasks.$[task].steps.$[step].txFailureIndex": {
                  $add: [
                    {
                      $ifNull: [
                        "tasks.$[task].steps.$[step].txFailureIndex",
                        0,
                      ],
                    },
                    1,
                  ],
                },
              },
            },
          ],
          {
            arrayFilters: [
              {
                "task.index": taskIndex,
                "task.type": TaskType.ClosePosition,
              },
              {
                "step.index": stepIndex,
              },
            ],
          },
        )

        // keep same behavior as your OpenPosition version
        return
      }

      throw error
    }
  }
}