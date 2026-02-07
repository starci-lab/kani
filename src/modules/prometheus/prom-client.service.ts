import {
    Injectable,
} from "@nestjs/common"
import {
    Registry,
} from "prom-client"

/**
 * Prometheus metrics registry and built-in metrics.
 *
 * @example
 * const metrics = app.get(PromClientService)
 */
@Injectable()
export class PromClientService {
    public readonly register: Registry
    constructor() {
        this.register = new Registry()
    }
}
