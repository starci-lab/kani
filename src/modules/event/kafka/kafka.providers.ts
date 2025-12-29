
import { Provider } from "@nestjs/common"
import { KAFKA, KAFKA_CONSUMER, KAFKA_PRODUCER, KAFKA_ADMIN } from "./constants"
import { Consumer, Kafka, Producer } from "kafkajs"
import { MODULE_OPTIONS_TOKEN } from "./kafka.module-definition"
import { envConfig } from "@modules/env"
import { v4 } from "uuid"
import { InstanceIdService } from "@modules/mixin"

export const createKafkaProvider = (): Provider => ({
    provide: KAFKA,
    inject: [MODULE_OPTIONS_TOKEN],
    useFactory: (): Kafka => {
        return new Kafka({
            brokers: [`${envConfig().kafka.host}:${envConfig().kafka.port}`],
            clientId: v4(),
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
            allowAutoTopicCreation: false,
            idempotent: true,
            maxInFlightRequests: 5,
            retry: { 
                retries: 5 
            },
        })
        await producer.connect()
        return producer
    }
})

export const createKafkaConsumerProvider = (): Provider => ({
    provide: KAFKA_CONSUMER,
    inject: [KAFKA, InstanceIdService],
    useFactory: async (
        kafka: Kafka, 
        instanceIdService: InstanceIdService
    ): Promise<Consumer> => {
        const consumer = kafka.consumer(
            { 
                groupId: `-${instanceIdService.getId()}-events`,   
            }
        )
        await consumer.connect()
        return consumer
    }
})

export const createKafkaAdminProvider = (): Provider => ({
    provide: KAFKA_ADMIN,
    inject: [KAFKA],
    useFactory: async (
        kafka: Kafka
    ) => {
        const admin = kafka.admin()
        await admin.connect()
        return admin
    }
})