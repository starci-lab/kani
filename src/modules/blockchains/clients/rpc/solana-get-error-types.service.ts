import {
    Injectable
} from "@nestjs/common"
import {
    SolanaError
} from "@solana/kit"
import {
    RpcErrorType
} from "../enums"

/**
 * Service responsible for classifying Solana RPC errors.
 * Determines whether errors are ignorable, retryable, or fatal.
 *
 * @example
 * const service = new SolanaGetErrorTypesService()
 * const errorType = service.getErrorType(solanaError)
 */
@Injectable()
export class SolanaGetErrorTypesService {
    /**
     * Determines the error type for a Solana RPC error.
     * Classifies errors as ignorable, retryable, or fatal based on error codes.
     *
     * @param param - Parameters for getting error type
     * @param param.error - Solana error to classify
     * @returns Classified error type
     *
     * @example
     * const errorType = service.getErrorType({ error: solanaError })
     */
    getErrorType({ error }: { error: SolanaError }): RpcErrorType {
        // extract error code and HTTP status code
        const code = error.context?.__code
        const http = error.context?.["statusCode"]
        
        // handle RPC transport HTTP layer errors
        if (code === 8100002 /* SOLANA_ERROR__RPC__TRANSPORT_HTTP_ERROR */) {
            // rate limit / gateway / temporary infrastructure issues
            const retryableStatusCodes: Array<number> = [
                429,
                502,
                503,
                504
            ]
            if (retryableStatusCodes.includes(http)) {
                return RpcErrorType.Ignorable
            }
            // unauthorized / forbidden => permanent failure
            const fatalStatusCodes: Array<number> = [
                401,
                403
            ]
            if (fatalStatusCodes.includes(http)) {
                return RpcErrorType.Fatal
            }
            // other HTTP errors -> retry cautiously
            return RpcErrorType.Ignorable
        }

        // API plan missing for RPC method -> permanent misconfiguration
        if (code === 8100003 /* SOLANA_ERROR__RPC__API_PLAN_MISSING_FOR_RPC_METHOD */) {
            return RpcErrorType.Fatal
        }
        
        // handle JSON-RPC server errors (-320xx range)
        if (code <= -32000 && code >= -32099) {
            // node unhealthy, slot not ready, block not available yet, etc.
            return RpcErrorType.Ignorable
        }
        
        // handle cluster / transaction runtime errors (7050000–7050015)
        if (code >= 7050000 && code <= 7618999) {
            return RpcErrorType.TransactionSubmitFailed
        }
        
        // handle RPC subscriptions errors (8190000–8190004)
        if (code >= 8190000 && code <= 8190004) {
            // websocket dropped, channel closed, reconnect needed
            return RpcErrorType.Ignorable
        }
        
        // handle invariant violations (SDK bug) (9900000+)
        if (code >= 9900000) {
            // internal library bug -> treat as fatal for this RPC
            return RpcErrorType.Fatal
        }
        
        // everything else: instruction errors, signer errors, codec errors, invalid input, etc.
        // deterministic failures: retrying will not help
        return RpcErrorType.Ignorable
    }
}
