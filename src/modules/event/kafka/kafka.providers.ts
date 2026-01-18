
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
    InstanceIdService 
} from "@modules/mixin"

export const createKafkaProvider = (): Provider => ({
    provide: KAFKA,
    inject: [InstanceIdService],
    useFactory: (instanceIdService: InstanceIdService): Kafka => {
        return new Kafka({
            brokers: [`${envConfig().kafka.host}:${envConfig().kafka.port}`],
            clientId: instanceIdService.getId(),
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