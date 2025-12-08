import { 
    BalanceService, 
    BalanceSnapshotConfirmationPayload, 
    BalanceSnapshotService 
} from "@modules/blockchains"
import { bullData, BullQueueName } from "@modules/bullmq"
import { RedlockKey, RedlockService } from "@modules/lock"
import { Processor as Worker, WorkerHost } from "@nestjs/bullmq"
import { Job } from "bullmq"
import { Connection } from "mongoose"
import { InjectPrimaryMongoose } from "@modules/databases"
import BN from "bn.js"

@Worker(bullData[BullQueueName.BalanceSnapshotConfirmation].name)
export class BalanceSnapshotConfirmationWorker extends WorkerHost {
    constructor(
        private readonly redlockService: RedlockService,
        private readonly balanceService: BalanceService,    
        private readonly balanceSnapshotService: BalanceSnapshotService,
        @InjectPrimaryMongoose()
        private readonly connection: Connection,
    ) {
        super()
    }

    async process(
        job: Job<BalanceSnapshotConfirmationPayload>
    ) {
        const { bot } = job.data
        const { targetBalanceAmount, quoteBalanceAmount, gasBalanceAmount } = await this.balanceService.fetchBalances({ bot })
        const session = await this.connection.startSession()
        await session.withTransaction(async () => {
            await this.balanceSnapshotService.updateBotSnapshotBalancesRecord({
                bot,
                targetBalanceAmount: new BN(targetBalanceAmount),
                quoteBalanceAmount: new BN(quoteBalanceAmount),
                gasBalanceAmount: new BN(gasBalanceAmount),
                session,
            })
        })
        await this.redlockService.releaseIfAcquired({
            botId: bot.id,
            redlockKey: RedlockKey.Action,
        })
    }   
}