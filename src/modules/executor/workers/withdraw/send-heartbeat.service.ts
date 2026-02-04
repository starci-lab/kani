import {
    Injectable
} from "@nestjs/common"
import {
    UnrecoverableError,
} from "bullmq"
import {
    HeartbeatTimeoutException,
} from "@modules/exceptions"
import {
    LockAuthorityService,
} from "../../bussiness"
import {
    SendHeartbeatParams,
} from "./types"

@Injectable()
export class SendHeartbeatService {
    constructor(
        private readonly lockAuthorityService: LockAuthorityService,
    ) {}

    /**
     * Sends a heartbeat to the lock authority for this bot.
     *
     * If the heartbeat cannot be sent, throws an UnrecoverableError so BullMQ will
     * not keep retrying a job that cannot safely proceed (prevents stuck jobs/locks).
     */
    async process(
        {
            bot,
            job,
            bullmqJob,
        }: SendHeartbeatParams
    ): Promise<void> {
        const isHeartbeatSent = await this.lockAuthorityService.sendHeartbeat(
            {
                botId: bot.id,
            }
        )

        if (!isHeartbeatSent) {
            throw new UnrecoverableError(
                new HeartbeatTimeoutException(
                    {
                        botId: bot.id,
                        jobId: job.id,
                        bullmqJobId: bullmqJob.id,
                    }
                ).toJSON()
            )
        }
    }
}


