
import { Inject } from "@nestjs/common"
import { KAFKA, KAFKA_PRODUCER, KAFKA_CONSUMER, KAFKA_ADMIN } from "./constants"

export const InjectKafka = () => Inject(KAFKA)
export const InjectKafkaProducer = () => Inject(KAFKA_PRODUCER)
export const InjectKafkaConsumer = () => Inject(KAFKA_CONSUMER)
export const InjectKafkaAdmin = () => Inject(KAFKA_ADMIN)
