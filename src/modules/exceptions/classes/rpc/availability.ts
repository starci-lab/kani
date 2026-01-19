/**
 * RPC Availability Exceptions
 * Errors related to RPC availability and ejection
 */

import {
    RpcAccessType 
} from "@modules/filesystem"
import {
    AbstractException,
    AbstractExceptionMetadata,
} from "../abstract"
import {
    ChainId,
} from "@modules/typedefs"

/** Thrown when all RPCs have been ejected for a chain */
export interface AllRpcsEjectedExceptionMetadata extends AbstractExceptionMetadata {
    chainId: ChainId
}

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

/** Thrown when no RPC is available for a chain */
export interface NoAvailableRpcExceptionMetadata extends AbstractExceptionMetadata {
    chainId: ChainId
    accessType: RpcAccessType
}

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
