import {
    Injectable,
} from "@nestjs/common"
import type {
    ConsulKvEntry,
    KvDeleteParams,
    KvDeleteResult,
    KvGetParams,
    KvGetResult,
    KvGetValueResult,
    KvPutParams,
    KvPutResult,
} from "./types"
import {
    ConsulRegisterService,
} from "./consul-register.service"

/**
 * Consul KV store service (get, put, delete).
 *
 * @example
 * const value = await consulKvService.kvGetValue("config/key")
 * await consulKvService.kvPut({ key: "config/key", value: "value" })
 */
@Injectable()
export class ConsulKvService {
    constructor(private readonly consulRegisterService: ConsulRegisterService) {}

    /**
     * Get KV value(s). Returns array of entries (metadata), keys array, or raw string.
     *
     * @param param - KV key and optional query params
     * @returns Array of entries or raw value; null if key not found (404)
     */
    async kvGet({ key, query }: KvGetParams): Promise<KvGetResult> {
        try {
            const { data } = await this.consulRegisterService.axios.get<
                Array<ConsulKvEntry> | Array<string> | string
            >(
                `/kv/${encodeURIComponent(key)}`,
                {
                    params: query 
                },
            )

            if (Array.isArray(data) && data.length === 0) {
                return null
            }

            return data as KvGetResult
        } catch (err: unknown) {
            if (typeof err === "object" && err !== null && "response" in err) {
                const res = (err as { response?: { status?: number } }).response
                if (res?.status === 404) return null
            }
            throw err
        }
    }

    /**
     * Get single KV value as decoded string.
     *
     * @param key - KV key path
     * @returns Decoded value or null if not found
     */
    async kvGetValue(key: string): Promise<KvGetValueResult> {
        const entries = await this.kvGet({
            key 
        })

        if (!entries || !Array.isArray(entries) || entries.length === 0) {
            return null
        }

        const entry = entries[0] as ConsulKvEntry
        if (!entry.Value) return ""

        return Buffer.from(entry.Value,
            "base64").toString("utf-8")
    }

    /**
     * Create or update KV key.
     *
     * @param param - Key path and value
     * @returns true if successful
     */
    async kvPut({ key, value }: KvPutParams): Promise<KvPutResult> {
        const payload = typeof value === "string"
            ? value
            : value.toString("utf-8")

        const { data } = await this.consulRegisterService.axios.put<boolean>(
            `/kv/${encodeURIComponent(key)}`,
            payload,
        )
        return data === true
    }

    /**
     * Delete KV key(s).
     *
     * @param param - Key path and optional recurse flag
     * @returns true if successful
     */
    async kvDelete({ key, recurse = false }: KvDeleteParams): Promise<KvDeleteResult> {
        const { data } = await this.consulRegisterService.axios.delete<boolean>(
            `/kv/${encodeURIComponent(key)}`,
            {
                params: {
                    recurse 
                } 
            },
        )
        return data === true
    }
}
