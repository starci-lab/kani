import {
    Injectable
} from "@nestjs/common"
import {
    JsonRpcError,
    SuiHTTPStatusError
} from "@mysten/sui/client"
import {
    RpcErrorType
} from "../enums"

/**
 * Set of JSON-RPC error codes that should trigger a retry.
 */
const TRANSACTION_SUBMIT_FAILED_JSON_RPC_CODES = new Set<number>([
    -32000, // CallExecutionFailed
])

/**
 * Service responsible for classifying Sui RPC errors.
 * Determines whether errors are ignorable, retryable, or fatal.
 *
 * @example
 * const service = new SuiGetErrorTypesService()
 * const errorType = service.getErrorType(error)
 */
@Injectable()
export class SuiGetErrorTypesService {
    /**
     * Determines the error type for a Sui RPC error.
     * Classifies errors as ignorable, retryable, or fatal based on error types.
     *
     * @param param - Parameters for getting error type
     * @param param.error - Error to classify
     * @returns Classified error type
     *
     * @example
     * const errorType = service.getErrorType({ error })
     */
    getErrorType({ error }: { error: Error }): RpcErrorType {
        // handle HTTP status errors
        if (error instanceof SuiHTTPStatusError) {
            // rate limit / gateway / temporary infrastructure issues
            const retryableStatusCodes: Array<number> = [
                429,
                502,
                503,
                504
            ]
            if (retryableStatusCodes.includes(error.status)) {
                return RpcErrorType.Ignorable
            }
            // unauthorized / forbidden => permanent failure
            const fatalStatusCodes: Array<number> = [
                401,
                403
            ]
            if (fatalStatusCodes.includes(error.status)) {
                return RpcErrorType.Fatal
            }
            return RpcErrorType.Ignorable
        }
        
        // handle JSON-RPC errors
        if (error instanceof JsonRpcError) {
            if (TRANSACTION_SUBMIT_FAILED_JSON_RPC_CODES.has(error.code)) {
                return RpcErrorType.TransactionSubmitFailed
            }
            return RpcErrorType.Ignorable
        }   
        // handle other errors
        return RpcErrorType.Ignorable
    }
}
