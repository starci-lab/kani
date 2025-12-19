import { Injectable } from "@nestjs/common"
import { 
    HealthCheckResult, 
    HealthCheckService, 
    HealthIndicatorFunction 
} from "@nestjs/terminus"
import { DependencyName } from "./config"
import { KafkaService } from "./kafka.service"
import { MongodbService } from "./mongodb.service"
import { RedisService } from "./redis.service"
import { DependencyNotFoundException } from "@exceptions"
import { DiskService } from "./disk.service"
import { MemoryService } from "./memory.service"

@Injectable()
export class DependenciesService {
    constructor(
        private readonly kafkaService: KafkaService,
        private readonly mongodbService: MongodbService,
        private readonly redisService: RedisService,
        private readonly diskService: DiskService,
        private readonly memoryService: MemoryService,
        private readonly healthCheckService: HealthCheckService,
    ) {}

    async ping(deps: Array<DependencyName>): Promise<HealthCheckResult> {
        const promises: Array<HealthIndicatorFunction> = []
        for (const dep of deps) {
            switch (dep) {
            case DependencyName.Kafka:
                promises.push(() => this.kafkaService.pingKafka())
                break
            case DependencyName.MongodbPrimary:
                promises.push(() => this.mongodbService.pingPrimaryMongodb())
                break
            case DependencyName.CacheRedis:
                promises.push(() => this.redisService.pingCacheRedis())
                break
            case DependencyName.AdapterRedis:
                promises.push(() => this.redisService.pingAdapterRedis())
                break
            case DependencyName.BullmqRedis:
                promises.push(() => this.redisService.pingBullmqRedis())
                break
            case DependencyName.ThrottlerRedis:
                promises.push(() => this.redisService.pingThrottlerRedis())
                break
            case DependencyName.Disk:
                promises.push(() => this.diskService.pingDisk())
                break
            case DependencyName.Memory:
                promises.push(() => this.memoryService.pingMemory())
                break
            default:
                throw new DependencyNotFoundException(dep, `Unknown dependency: ${dep}`)
            }
        }
        return this.healthCheckService.check(promises)
    }
}