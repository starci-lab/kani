import {
    Injectable 
} from "@nestjs/common"
import {
    MemoryHealthIndicator, HealthIndicatorResult 
} from "@nestjs/terminus"
import {
    DependencyName 
} from "./config"
import {
    envConfig 
} from "@modules/env"

@Injectable()
export class MemoryService {
    constructor(
        private readonly memoryHealthIndicator: MemoryHealthIndicator,
    ) {}

    /**
     * Ping the memory.
     * @returns The health check result.
     */
    async pingMemory(): Promise<HealthIndicatorResult> {
        return this.memoryHealthIndicator.checkRSS(
            DependencyName.Memory,
            envConfig().resources.ram.threadhold,
        )
    }
}