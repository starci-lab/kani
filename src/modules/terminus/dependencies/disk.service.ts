import { Injectable } from "@nestjs/common"
import { DiskHealthIndicator, HealthIndicatorResult } from "@nestjs/terminus"
import { DependencyName } from "./config"
import { envConfig } from "@modules/env"

@Injectable()
export class DiskService {
    constructor(
        private readonly diskHealthIndicator: DiskHealthIndicator,
    ) {}

    async pingDisk(): Promise<HealthIndicatorResult> {
        return this.diskHealthIndicator.checkStorage(
            DependencyName.Disk, {
                path: envConfig().isProduction ? "/" : process.cwd(),
                thresholdPercent: envConfig().resources.disk.threadholdPercent,
            },
        )
    }
}