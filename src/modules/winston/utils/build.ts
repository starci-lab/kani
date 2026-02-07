import {
    ServiceName,
} from "@modules/common"

/** Build application name from service name and ID. */
export const buildAppName = (
    serviceName: ServiceName = ServiceName.KaniUnknown, 
    id?: string
) => {
    const map = {
        [ServiceName.KaniExecutor]: "Kani Executor",
        [ServiceName.KaniObserver]: "Kani Observer",
        [ServiceName.KaniCoordinator]: "Kani Coordinator",
        [ServiceName.KaniCLI]: "Kani CLI",
        [ServiceName.KaniInterface]: "Kani Interface",
        [ServiceName.KaniUnknown]: "Kani Unknown",
    }
    const name = map[serviceName]
    return id ? `${name} ${id}` : name
}   