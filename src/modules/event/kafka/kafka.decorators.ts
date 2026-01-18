
import {
    Inject 
} from "@nestjs/common"
import {
    KAFKA, KAFKA_ADMIN 
} from "./constants"

export const InjectKafka = () => Inject(KAFKA)
export const InjectKafkaAdmin = () => Inject(KAFKA_ADMIN)
