import {
    Injectable,
} from "@nestjs/common"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import {
    Cron,
    CronExpression,
} from "@nestjs/schedule"
import bytes from "bytes"

@Injectable()
export class RamService {
    constructor(private readonly winstonService: WinstonService) {}

    /**
     * Logs current process memory usage (rss, heapTotal, heapUsed, external) via Winston.
     */
    @Cron(CronExpression.EVERY_10_SECONDS)
    logMemoryUsage(): void {
        const used = process.memoryUsage()
        this.winstonService.log(
            WinstonLog.ResourcesMemoryUsage,
            {
                rss: bytes(used.rss ?? 0) as string,
                heapTotal: bytes(used.heapTotal ?? 0) as string,
                heapUsed: bytes(used.heapUsed ?? 0) as string,
                external: bytes(used.external ?? 0) as string,
            }
        )
    }
}
