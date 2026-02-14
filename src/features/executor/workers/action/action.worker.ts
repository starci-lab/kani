import {
    Processor as Worker,
    WorkerHost,
} from "@nestjs/bullmq"
import {
    BullQueueName,
    bullData,
} from "@modules/bullmq"
import {
    envConfig,
} from "@modules/env"
import {
    InjectPrimaryMongoose,
    TaskType,
} from "@modules/databases"
import {
    InjectSuperJson,
} from "@modules/mixin"
import {
    Connection,
} from "mongoose"
import SuperJSON from "superjson"
import {
    Job 
} from "bullmq"
import {
    ActionPayload 
} from "@modules/blockchains"
import {
    OnFailedService,
} from "./on-failed.service"
import {
    OnCompletedService,
} from "./on-completed.service"
import {
    JobContextService, 
    LiquidityPoolContextService
} from "./context"
import {
    AsyncService 
} from "@modules/mixin"
import {
    WinstonLog, WinstonService 
} from "@modules/winston"
import {
    CancelService 
} from "./cancel.service"
import {
    ClosePositionTaskDispatchService 
} from "./tasks"
@Worker(
    bullData[BullQueueName.Action].name,
    {
        concurrency: envConfig().bullmq.concurrency,
        lockDuration: envConfig().bullmq.lockDuration,
        stalledInterval: envConfig().bullmq.stalledInterval,
        maxStalledCount: envConfig().bullmq.maxStalledCount,
    }
)
export class ActionWorker extends WorkerHost {
    constructor(
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
        private readonly onFailedService: OnFailedService,
        private readonly asyncService: AsyncService,
        private readonly onCompletedService: OnCompletedService,
        private readonly jobContextService: JobContextService,
        private readonly liquidityPoolContextService: LiquidityPoolContextService,
        private readonly winstonService: WinstonService,
        private readonly cancelService: CancelService,
        private readonly closePositionTaskDispatchService: ClosePositionTaskDispatchService,
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) {
        super()
    }

    async process(
        bullmqJob: Job<string>
    ): Promise<void> {
        const payload = this.superJson.parse<ActionPayload>(bullmqJob.data)
        const { jobId, botId, tasks } = payload
        // Load the job and bot context
        const [
            context,
            error
        ] = await this.asyncService.resolveTuple(
            this.jobContextService.load({
                jobId, botId 
            }
            )
        )
        if (error) {
            this.winstonService.log(
                WinstonLog.ActionJobContextLoadFailed,
                {
                    jobId,
                    botId,
                    type: payload.type,
                    error: error.message,
                }
            )
            await this.cancelService.process(
                {
                    jobId,
                    botId,
                }
            )
            return
        }
        // end load the job and bot context
        try {
            for (const task of tasks) {
                switch (task.type) {
                case TaskType.ClosePosition: {
                    const { 
                        liquidityPool, 
                        state 
                    } = await this.liquidityPoolContextService.load({
                        liquidityPoolId: task.payload.liquidityPoolId,
                    })
                    await this.closePositionTaskDispatchService.dispatch(
                        {
                            job: context.job,
                            bot: context.bot,
                            liquidityPool,
                            payload: task.payload,
                            state,
                            bullmqJob,
                            taskIndex: 0,
                        }
                    )
                    break
                }
                }
            }
            await this.onCompletedService.process(
                {
                    job: context.job,
                    bot: context.bot,
                    bullmqJob,
                    payload,
                }
            )
        } catch (error) {
            await this.onFailedService.process(
                {
                    job: context.job,
                    bot: context.bot,
                    bullmqJob,
                    error,
                }
            )
        }
    }
}