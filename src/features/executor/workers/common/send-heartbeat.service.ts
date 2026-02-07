import {
    Injectable
} from "@nestjs/common"
import {
    HeartbeatTimeoutException,
    JobFailureException,
    JobFailureStrategy,
} from "@modules/exceptions"
import {
    LockAuthorityService,
} from "../../bussiness"
import type {
    SendHeartbeatParams,
} from "./types"

@Injectable()
export class SendHeartbeatService {
    constructor(
        private readonly lockAuthorityService: LockAuthorityService,
    ) {}

    /**
     * Sends a heartbeat to the lock authority for the current bot/job.
     *
     * Keeps the lock alive while long-running phases (prepare/execute/confirm) run.
     * If the heartbeat fails (e.g. lock expired), throws JobFailureException with
     * Requeue strategy so the job is put back to the queue for a fresh attempt.
     */
    async process(
        {
            bot,
            job,
            bullmqJob,
        }: SendHeartbeatParams
    ): Promise<void> {
        const ok = await this.lockAuthorityService.sendHeartbeat(
            {
                botId: bot.id,
            }
        )

        if (!ok) {
            throw new JobFailureException(
                {
                    originalError: new HeartbeatTimeoutException(
                        {
                            botId: bot.id,
                            jobId: job.id,
                            bullmqJobId: bullmqJob.id,
                        }
                    ),
                    strategy: JobFailureStrategy.Requeue,
                }
            )
        }
    }
}


