/**
 * RPC Exceptions
 * Errors related to RPC connections and load balancing
 */

import { AbstractException } from "../abstract"
import { ChainId } from "@typedefs"

/** Thrown when load balancer name is not found */
export class LoadBalancerNameNotFoundException extends AbstractException {
    constructor(message?: string) {
        super(message || "Load balancer name not found", "LOAD_BALANCER_NAME_NOT_FOUND_EXCEPTION")
    }
}

/** Thrown when all RPCs have been ejected for a chain */
export class AllRpcsEjectedException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || `All RPCs ejected for chain ${chainId}`, "ALL_RPCS_EJECTED_EXCEPTION", { chainId })
    }
}

/** Thrown when no RPC is available for a chain */
export class NoAvailableRpcException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || `No available RPC for chain ${chainId}`, "NO_AVAILABLE_RPC_EXCEPTION", { chainId })
    }
}

/** Thrown when ejected RPCs cache result is not found */
export class EjectedRpcsCacheResultNotFoundException extends AbstractException {
    constructor(chainId: ChainId, message?: string) {
        super(message || `Ejected RPCs cache result not found for chain ${chainId}`, "EJECTED_RPCS_CACHE_RESULT_NOT_FOUND_EXCEPTION", { chainId })
    }
}
