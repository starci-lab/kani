import { envConfig } from "@modules/env"
import { Injectable } from "@nestjs/common"
import {
    HealthIndicatorResult,
    MicroserviceHealthIndicator,
    MicroserviceHealthIndicatorOptions,
} from "@nestjs/terminus"
import {
    MicroserviceOptions,
    Transport,
} from "@nestjs/microservices"
import { DependencyName } from "./config"

/**
 * Health check service for NATS.
 */
@Injectable()
export class NatsService {
    constructor(
        private readonly microserviceHealthIndicator: MicroserviceHealthIndicator,
    ) {}

    private buildNatsOptions(): MicroserviceHealthIndicatorOptions<MicroserviceOptions> {
        const cfg = envConfig().nats
        return {
            transport: Transport.NATS,
            options: {
                servers: cfg.servers,
            },
            timeout: envConfig().terminus.timeout,
        }
    }

    async pingNats(): Promise<HealthIndicatorResult> {
        return this.microserviceHealthIndicator.pingCheck<MicroserviceOptions>(
            DependencyName.Nats,
            this.buildNatsOptions(),
        )
    }
}
