
import {
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

export const createKafkaProvider = (): Provider => ({
    provide: KAFKA,
    inject: [MODULE_OPTIONS_TOKEN],
    useFactory: (options: typeof OPTIONS_TYPE): Kafka => {
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