import {
    envConfig 
} from "@modules/env"
import {
    Injectable 
} from "@nestjs/common"
import { 
    HealthIndicatorResult, 
    MicroserviceHealthIndicator, 
    MicroserviceHealthIndicatorOptions 
} from "@nestjs/terminus"
import {
    MicroserviceOptions, Transport 
} from "@nestjs/microservices"
import {
    DependencyName 
} from "./config"
import {
    InstanceIdService 
} from "@modules/mixin"

/**
 * The service for the Kafka.
 */
@Injectable()
export class KafkaService {
    constructor(
        private readonly microserviceHealthIndicator: MicroserviceHealthIndicator,
        private readonly instanceIdService: InstanceIdService,
    ) {}

    /**
     * Build the Kafka options.
     * @returns The Kafka options.
     */
    private buildKafkaOptions(): MicroserviceHealthIndicatorOptions<MicroserviceOptions> {
        const cfg = envConfig().kafka
        const options: MicroserviceHealthIndicatorOptions<MicroserviceOptions> = {
            transport: Transport.KAFKA,
            options: {
                client: {
                    clientId: this.instanceIdService.getId(),
                    brokers: [
                        `${cfg.host}:${cfg.port}`,
                    ],
                    sasl: cfg.sasl.enabled ? {
                        mechanism: "scram-sha-256",
                        username: cfg.sasl.username,
                        password: cfg.sasl.password,
                    } : undefined,
                },
            },
        }
        return options
    }

    /**
     * Health check for Kafka
     */
    async pingKafka(): Promise<HealthIndicatorResult> {
        return this.microserviceHealthIndicator.pingCheck<MicroserviceOptions>(
            DependencyName.Kafka,
            this.buildKafkaOptions(),
        )
    }
}