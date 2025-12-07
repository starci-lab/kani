import { AbstractException } from "../abstract"

export class LoadBalancerNameNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Load balancer name not found", "LOAD_BALANCER_NAME_NOT_FOUND_EXCEPTION")
    }
}