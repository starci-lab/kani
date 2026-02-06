import {
    RetryOptions
} from "@modules/mixin"
import {
    RpcAccessType
} from "@modules/filesystem"
import {
    Rpc,
    RpcSubscriptions,
    SolanaRpcApi,
    SolanaRpcSubscriptionsApi
} from "@solana/kit"

/**
 * Parameters for executing a callback with Solana RPC client.
 * Supports different access types (Http, Ws, Write) with appropriate callback signatures.
 */
export type WithSolanaRpcParams<TResult = void> =
    (
        {
            /** Callback function that receives RPC client (Http access only). */
            callback: (params: Omit<WithSolanaRpcCallbackParams, "rpcSubscriptions">) => Promise<TResult>
            /** HTTP access type. */
            accessType: RpcAccessType.Http
        } | {
            /** Callback function that receives RPC subscriptions (Ws access only). */
            callback: (params: Omit<WithSolanaRpcCallbackParams, "rpc">) => Promise<TResult>
            /** WebSocket access type. */
            accessType: RpcAccessType.Ws
        } | {
            /** Callback function that receives both RPC and RPC subscriptions (Write access). */
            callback: (params: WithSolanaRpcCallbackParams) => Promise<TResult>
            /** Write access type (requires both HTTP and WebSocket). */
            accessType: RpcAccessType.Write
        }
    ) & {
        /** Optional retry configuration. */
        options?: RetryOptions
    }

/**
 * Parameters passed to Solana RPC callback function.
 */
export interface WithSolanaRpcCallbackParams {
    /** Solana RPC client for HTTP operations. */
    rpc: Rpc<SolanaRpcApi>
    /** Solana RPC subscriptions client for WebSocket operations. */
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>
    /** RPC endpoint URL. */
    rpcUrl: string
}
