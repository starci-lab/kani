/** RPC ejection record. */
export interface RpcEjection {
    rpcId: string
    ejectedAt: Date
}

/** RPC ejection state. */
export interface RpcEjectionState {
    data: Array<RpcEjection>
}

/** Generic state record wrapper. */
export interface StateRecord<T> {
    value: T
}
