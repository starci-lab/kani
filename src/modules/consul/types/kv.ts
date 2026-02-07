/** Consul KV entry (metadata response from /kv API). */
export interface ConsulKvEntry {
    CreateIndex: number
    ModifyIndex: number
    LockIndex: number
    Key: string
    Flags: number
    Value: string
    Session?: string
}

/** Query parameters for Consul KV get request. */
export interface ConsulKvQueryParams {
    dc?: string
    recurse?: boolean
    raw?: boolean
    keys?: boolean
    separator?: string
}

/** Params for kvGet. */
export interface KvGetParams {
    key: string
    query?: ConsulKvQueryParams
}

/** Result of kvGet; entries array, keys array, raw string, or null when not found. */
export type KvGetResult = Array<ConsulKvEntry> | Array<string> | string | null

/** Result of kvGetValue; decoded string or null. */
export type KvGetValueResult = string | null

/** Params for kvPut. */
export interface KvPutParams {
    key: string
    value: string | Buffer
}

/** Result of kvPut. */
export type KvPutResult = boolean

/** Params for kvDelete. */
export interface KvDeleteParams {
    key: string
    recurse?: boolean
}

/** Result of kvDelete. */
export type KvDeleteResult = boolean

/** Result of statusLeader. */
export type StatusLeaderResult = string
