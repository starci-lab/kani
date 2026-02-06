/**
 * RPC availability exceptions.
 * Errors related to RPC availability and ejection.
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
import type {
    RpcAccessType 
} from "@modules/filesystem"

/** Metadata when all RPCs have been ejected for a chain. */
export interface AllRpcsEjectedExceptionMetadata extends AbstractExceptionMetadata {
    chainId: ChainId
}

/** Thrown when all RPCs have been ejected for a chain. */
export class AllRpcsEjectedException extends AbstractException {
    constructor(
        {
            chainId,
            originalError,
        }: AllRpcsEjectedExceptionMetadata
    ) {
        super(
            "All RPCs ejected for chain",
            "ALL_RPCS_EJECTED_EXCEPTION",
            {
                chainId,
                originalError,
            }
        )
    }
}

/** Metadata when no RPC is available for a chain. */
export interface NoAvailableRpcExceptionMetadata extends AbstractExceptionMetadata {
    chainId: ChainId
    accessType: RpcAccessType
}

/** Thrown when no RPC is available for a chain. */
export class NoAvailableRpcException extends AbstractException {
    constructor(
        {
            chainId,
            accessType,
            originalError,
        }: NoAvailableRpcExceptionMetadata
    ) {
        super(
            "No available RPC for chain",
            "NO_AVAILABLE_RPC_EXCEPTION",
            {
                accessType,
                chainId,
                originalError,
            }
        )
    }
}
