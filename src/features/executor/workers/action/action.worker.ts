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
        @InjectSuperJson()
        private readonly superJson: SuperJSON,
    ) {
        super()
    }

    async process(
        bullmqJob: Job<string>
    ): Promise<void> {
        const payload = this.superJson.parse<ActionPayload>(bullmqJob.data)
        const { botId, jobId, tasks } = payload
        console.log(`botId: ${botId}, jobId: ${jobId}`)
        console.log(tasks)
    }
}