/**
 * Re-exports of RPC executor-related types.
 * Types are defined in chain-specific modules (solana, sui).
 */
export type {
    WithSolanaRpcParams
} from "../solana/types"
export type {
    WithSuiClientParams
} from "../sui/types"

/**
 * Represents HTTP and WebSocket clients for a given client type.
 */
export interface HttpAndWsClients<ClientType> {
    /** Array of HTTP clients. */
    http: Array<ClientType>
    /** Array of WebSocket clients. */
    ws: Array<ClientType>
}
