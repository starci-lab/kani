import type {
    Provider 
} from "@nestjs/common"
import {
    KAFKA, KAFKA_ADMIN 
} from "./constants"
import {
    Kafka, logLevel 
} from "kafkajs"
import {
    envConfig 
} from "@modules/env"
import {
    MODULE_OPTIONS_TOKEN, OPTIONS_TYPE 
} from "./kafka.module-definition"

/**
 * Creates a provider for the Kafka client instance.
 *
 * @returns Provider that creates and configures a Kafka client
 */
export const createKafkaProvider = (): Provider => ({
    provide: KAFKA,
    inject: [MODULE_OPTIONS_TOKEN],
    useFactory: (options: typeof OPTIONS_TYPE): Kafka => {
        // create Kafka client with configuration
        return new Kafka({
            brokers: [`${envConfig().kafka.host}:${envConfig().kafka.port}`],
            clientId: options?.clientId,
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