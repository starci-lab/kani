import {
    Injectable,
} from "@nestjs/common"
import {
    WinstonLog,
    WinstonService,
} from "@modules/winston"
import bytes from "bytes"
import {
    envConfig 
} from "@modules/env"
import {
    Interval 
} from "@nestjs/schedule"

@Injectable()
export class RamService {
    constructor(private readonly winstonService: WinstonService) {}

    /**
     * Logs current process memory usage (rss, heapTotal, heapUsed, external) via Winston.
     */
    @Interval(envConfig().resources.ram.intervalMs)
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
