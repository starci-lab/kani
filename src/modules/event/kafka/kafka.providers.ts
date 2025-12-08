
import { Provider } from "@nestjs/common"
import { KAFKA, KAFKA_CONSUMER, KAFKA_PRODUCER } from "./constants"
import { Consumer, Kafka, logLevel, Producer } from "kafkajs"
import { MODULE_OPTIONS_TOKEN } from "./kafka.module-definition"
import { KafkaOptions } from "./types"
import { envConfig } from "@modules/env"
import { v4 } from "uuid"

export const createKafkaProvider = (): Provider => ({
    provide: KAFKA,
    inject: [MODULE_OPTIONS_TOKEN],
    useFactory: ({ clientId }: KafkaOptions): Kafka => {
        console.log(envConfig().kafka)
        return new Kafka({
            brokers: [`${envConfig().kafka.host}:${envConfig().kafka.port}`],
            clientId: clientId ?? v4(),
            logLevel: logLevel.NOTHING,
            sasl: envConfig().kafka.sasl.enabled ? {
                mechanism: "scram-sha-256",
                username: envConfig().kafka.sasl.username,
                password: envConfig().kafka.sasl.password,
            } : undefined,
        })
    }
})

export const createKafkaProducerProvider = (): Provider => ({
    provide: KAFKA_PRODUCER,
    inject: [KAFKA],
    useFactory: async (kafka: Kafka): Promise<Producer> => {
        const producer = kafka.producer({ 
            allowAutoTopicCreation: true,
            idempotent: true,
            maxInFlightRequests: 5,
            retry: { retries: 5 },
        })
        await producer.connect()
        return producer
    }
})

export const createKafkaConsumerProvider = (): Provider => ({
    provide: KAFKA_CONSUMER,
    inject: [KAFKA],
    useFactory: async (kafka: Kafka): Promise<Consumer> => {
        const consumer = kafka.consumer({ groupId: `${envConfig().kafka.clientId}-events` })
        await consumer.connect()
        return consumer
    }
})
