import {
    Provider,
} from "@nestjs/common"
import {
    Registry,
} from "prom-client"
import {
    PROMETHEUS_REGISTRY,
} from "./constants"

export const createPrometheusRegistryProvider = (): Provider => ({
    provide: PROMETHEUS_REGISTRY,
    useFactory: () => new Registry(),
})