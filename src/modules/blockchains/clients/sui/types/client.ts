import {
    RetryOptions
} from "@modules/mixin"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    SuiClient
} from "@mysten/sui/client"

/**
 * Parameters for executing a callback with Sui client.
 * Supports different access types (Http, Write) with appropriate callback signatures.
 */
export type WithSuiClientParams<TResult = void> =
    (
        {
            /** Callback function that receives Sui client. */
            callback: (params: WithSuiClientCallbackParams) => Promise<TResult>
            /** HTTP access type. */
            accessType: RpcAccessType.Http
        } | {
            /** Callback function that receives Sui client. */
            callback: (params: WithSuiClientCallbackParams) => Promise<TResult>
            /** Write access type. */
            accessType: RpcAccessType.Write
        }
    ) & {
        /** Optional retry configuration. */
        options?: RetryOptions
    }

/**
 * Parameters passed to Sui client callback function.
 */
export interface WithSuiClientCallbackParams {
    /** Sui client instance. */
    suiClient: SuiClient
    /** RPC endpoint URL. */
    rpcUrl: string
}
