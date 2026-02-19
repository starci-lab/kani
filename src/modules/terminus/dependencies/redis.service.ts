import {
    Injectable 
} from "@nestjs/common"
import {
    HealthIndicatorResult, MicroserviceHealthIndicator 
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

@Injectable()
export class RedisService {
    constructor(
        private readonly microserviceHealthIndicator: MicroserviceHealthIndicator,
    ) {}


    async pingCacheRedis(): Promise<HealthIndicatorResult> {
        return this.microserviceHealthIndicator.pingCheck<MicroserviceOptions>(
            DependencyName.CacheRedis,
            {
                transport: Transport.REDIS,
                options: {
                    host: envConfig().redis.cache.host,
                    port: envConfig().redis.cache.port,
                    password: envConfig().redis.cache.password,
                },
                timeout: envConfig().terminus.timeout,
            },
        )
    }

    async pingAdapterRedis(): Promise<HealthIndicatorResult> {
        return this.microserviceHealthIndicator.pingCheck<MicroserviceOptions>(
            DependencyName.AdapterRedis,
            {
                transport: Transport.REDIS,
                options: {
                    host: envConfig().redis.adapter.host,
                    port: envConfig().redis.adapter.port,
                    password: envConfig().redis.adapter.password,
                },
                timeout: envConfig().terminus.timeout,
            },
        )
    }

    async pingBullmqRedis(): Promise<HealthIndicatorResult> {
        return this.microserviceHealthIndicator.pingCheck<MicroserviceOptions>(
            DependencyName.BullmqRedis,
            {
                transport: Transport.REDIS,
                options: {
                    host: envConfig().redis.bullmq.host,
                    port: envConfig().redis.bullmq.port,
                    password: envConfig().redis.bullmq.password,
                },
                timeout: envConfig().terminus.timeout,
            },
        )
    }

    async pingThrottlerRedis(): Promise<HealthIndicatorResult> {
        return this.microserviceHealthIndicator.pingCheck<MicroserviceOptions>(
            DependencyName.ThrottlerRedis,
            {
                transport: Transport.REDIS,
                options: {
                    host: envConfig().redis.throttler.host,
                    port: envConfig().redis.throttler.port,
                    password: envConfig().redis.throttler.password,
                },
                timeout: envConfig().terminus.timeout,
            },
        )
    }

    async pingLockAuthorityRedis(): Promise<HealthIndicatorResult> {
        return this.microserviceHealthIndicator.pingCheck<MicroserviceOptions>(
            DependencyName.LockAuthorityRedis,
            {
                transport: Transport.REDIS,
                options: {
                    host: envConfig().redis.lockAuthority.host,
                    port: envConfig().redis.lockAuthority.port,
                    password: envConfig().redis.lockAuthority.password,
                },
                timeout: envConfig().terminus.timeout,
            },
        )
    }
}