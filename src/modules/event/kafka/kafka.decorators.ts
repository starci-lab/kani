import {
    Inject 
} from "@nestjs/common"
import {
    KAFKA, KAFKA_ADMIN 
} from "./constants"

/**
 * Decorator for injecting the Kafka client.
 *
 * @returns Parameter decorator for Kafka client injection
 *
 * @example
 * constructor(@InjectKafka() private readonly kafka: Kafka) {}
 */
export const InjectKafka = () => Inject(KAFKA)

/**
 * Decorator for injecting the Kafka admin client.
 *
 * @returns Parameter decorator for Kafka admin client injection
 *
 * @example
 * constructor(@InjectKafkaAdmin() private readonly admin: Admin) {}
 */
export const InjectKafkaAdmin = () => Inject(KAFKA_ADMIN)
