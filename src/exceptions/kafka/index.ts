import { AbstractException } from "@exceptions"

export class KafkaTimeoutException extends AbstractException {
    constructor(topics: Array<string>) {
        super(`Timeout waiting for Kafka topics to be created: ${topics.join(", ")}`, "KAFKA_TIMEOUT_EXCEPTION", { topics })
    }
}   