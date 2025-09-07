
import { Inject } from "@nestjs/common"
import { KAFKA, KAFKA_PRODUCER, KAFKA_CONSUMER } from "./kafka.constants"

export const InjectKafka = () => Inject(KAFKA)
export const InjectKafkaProducer = () => Inject(KAFKA_PRODUCER)
export const InjectKafkaConsumer = () => Inject(KAFKA_CONSUMER)
