/**
 * RPC not-found exceptions.
 * Errors related to missing RPC configuration or cache.
 */

import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    ChainId 
} from "@modules/common"

/** Metadata when load balancer name is not found. */
export interface LoadBalancerNameNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    chainId: ChainId
}

/** Thrown when load balancer name is not found. */
export class LoadBalancerNameNotFoundException extends AbstractException {
    constructor(
        {
            chainId,
            originalError,
        }: LoadBalancerNameNotFoundExceptionMetadata
    ) {
        super(
            "Load balancer name not found",
            "LOAD_BALANCER_NAME_NOT_FOUND_EXCEPTION",
            {
                chainId,
                originalError,
            }
        )
    }
}

/** Metadata when ejected RPCs cache result is not found. */
export interface EjectedRpcsCacheResultNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    chainId: ChainId
}

/** Thrown when ejected RPCs cache result is not found. */
export class EjectedRpcsCacheResultNotFoundException extends AbstractException {
    constructor(
        {
            chainId,
            originalError,
        }: EjectedRpcsCacheResultNotFoundExceptionMetadata
    ) {
        super(
            "Ejected RPCs cache result not found for chain",
            "EJECTED_RPCS_CACHE_RESULT_NOT_FOUND_EXCEPTION",
            {
                chainId,
                originalError,
            }
        )
    }
}
