import {
    Injectable 
} from "@nestjs/common"
import {
    HealthIndicatorResult, MicroserviceHealthIndicator, MicroserviceHealthIndicatorOptions 
} from "@nestjs/terminus"
import {
    MicroserviceOptions, Transport 
} from "@nestjs/microservices"
import {
    DependencyName 
} from "./config"
import {
    envConfig 
} from "@modules/env"

type RedisTarget = "cache" | "adapter" | "bullmq" | "throttler" | "lockAuthority"

@Injectable()
export class RedisService {
    // Cache config once (avoid calling envConfig() repeatedly)
    private readonly redis = envConfig().redis
    constructor(
        private readonly microserviceHealthIndicator: MicroserviceHealthIndicator,
    ) {}

    /**
     * Build Redis microservice options with retry + timeout
     */
    private buildRedisOptions(target: RedisTarget): MicroserviceHealthIndicatorOptions<MicroserviceOptions> {
        const cfg = this.redis[target]

        const options: MicroserviceHealthIndicatorOptions<MicroserviceOptions> = {
            transport: Transport.REDIS,
            options: {
                host: cfg.host,
                port: cfg.port,
                password: cfg.password,
            },
        }
        return options
    }

    async pingCacheRedis(): Promise<HealthIndicatorResult> {
        return await this.microserviceHealthIndicator.pingCheck<MicroserviceOptions>(
            DependencyName.CacheRedis,
            this.buildRedisOptions("cache"),
        )
    }

    async pingAdapterRedis(): Promise<HealthIndicatorResult> {
        return await this.microserviceHealthIndicator.pingCheck<MicroserviceOptions>(
            DependencyName.AdapterRedis,
            this.buildRedisOptions("adapter"),
        )
    }

    async pingBullmqRedis(): Promise<HealthIndicatorResult> {
        return await this.microserviceHealthIndicator.pingCheck<MicroserviceOptions>(
            DependencyName.BullmqRedis,
            this.buildRedisOptions("bullmq"),
        )
    }

    async pingThrottlerRedis(): Promise<HealthIndicatorResult> {
        return await this.microserviceHealthIndicator.pingCheck<MicroserviceOptions>(
            DependencyName.ThrottlerRedis,
            this.buildRedisOptions("throttler"),
        )
    }

    async pingLockAuthorityRedis(): Promise<HealthIndicatorResult> {
        return await this.microserviceHealthIndicator.pingCheck<MicroserviceOptions>(
            DependencyName.LockAuthorityRedis,
            this.buildRedisOptions("lockAuthority"),
        )
    }
}