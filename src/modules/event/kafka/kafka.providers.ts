import type {
    Provider 
} from "@nestjs/common"
import {
    Kafka, logLevel 
} from "kafkajs"
import {
    envConfig 
} from "@modules/env"
import {
    KAFKA, KAFKA_ADMIN 
} from "./constants"

/**
 * Creates a provider for the Kafka client instance.
 *
 * @returns Provider that creates and configures a Kafka client
 */
export const createKafkaProvider = (): Provider => ({
    provide: KAFKA,
    inject: [],
    useFactory: (): Kafka => {
        return new Kafka({
            brokers: envConfig().kafka.brokers.map((broker) => `${broker.host}:${broker.port}`),
            clientId: envConfig().k8s.global.podName,
            logLevel: logLevel.NOTHING,
            sasl: envConfig().kafka.sasl.enabled ? {
                mechanism: "scram-sha-256",
                username: envConfig().kafka.sasl.username,
                password: envConfig().kafka.sasl.password,
            } : undefined,
        }
        )
    }
})

/**
 * Creates a provider for the Kafka admin client instance.
 *
 * @returns Provider that creates and connects a Kafka admin client
 */
export const createKafkaAdminProvider = (): Provider => ({
    provide: KAFKA_ADMIN,
    inject: [KAFKA],
    useFactory: async (
        kafka: Kafka
    ) => {
        // create admin client
        const admin = kafka.admin()

        // connect admin client
        await admin.connect()

        return admin
    }
})