import {
    Inject,
} from "@nestjs/common"
import {
    PROMETHEUS_REGISTRY,
} from "./constants"

export const InjectPrometheusRegistry = () => Inject(PROMETHEUS_REGISTRY)