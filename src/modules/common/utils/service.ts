import {
    type ServiceName,
} from "../enums/service"

/** Build service identifier from ServiceName and optional id. */
export const buildServiceId = (
    serviceName: ServiceName,
    id?: string,
): string =>
    id ? `${serviceName}-${id}` : serviceName
