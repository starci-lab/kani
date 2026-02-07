import {
    ServiceName 
} from "@modules/common"

/** Build Kafka client ID from service name and ID. */
export const buildKafkaClientId = (serviceName: ServiceName = ServiceName.KaniUnknown, id?: string) => {
    const map = {
        [ServiceName.KaniExecutor]: "kani-executor",
        [ServiceName.KaniObserver]: "kani-observer",
        [ServiceName.KaniCoordinator]: "kani-coordinator",
        [ServiceName.KaniCLI]: "kani-cli",
        [ServiceName.KaniInterface]: "kani-interface",
        [ServiceName.KaniUnknown]: "kani-unknown",
    }
    const name = map[serviceName]
    return id ? `${name}-${id}` : name
}