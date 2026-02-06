import {
    Injectable 
} from "@nestjs/common"
import {
    DiskHealthIndicator, HealthIndicatorResult 
} from "@nestjs/terminus"
import {
    DependencyName 
} from "./config"
import {
    envConfig 
} from "@modules/env"

/**
 * The service for the disk.
 */
@Injectable()
export class DiskService {
    constructor(
        private readonly diskHealthIndicator: DiskHealthIndicator,
    ) {}

    /**
     * Ping the disk.
     * @returns The health check result.
     */
    async pingDisk(): Promise<HealthIndicatorResult> {
        return this.diskHealthIndicator.checkStorage(
            DependencyName.Disk,
            {
                path: envConfig().isProduction ? "/" : process.cwd(),
                thresholdPercent: envConfig().resources.disk.threadholdPercent,
            },
        )
    }
}