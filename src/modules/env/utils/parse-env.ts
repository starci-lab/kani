import ms from "ms"
import type {
    ParseEnvBooleanParams,
    ParseEnvFloatParams,
    ParseEnvIntParams,
    ParseEnvMsParams,
    ParseEnvSecondParams,
    ParseEnvStringParams,
} from "../types"

/**
 * Parse an env var as integer (radix 10). Uses default when unset.
 *
 * @param params - key and defaultValue
 * @returns Parsed number
 */
export const parseEnvInt = ({ key, defaultValue }: ParseEnvIntParams): number => {
    return parseInt(process.env[key] ?? defaultValue.toString(),
        10)
}

/**
 * Parse an env var as float. Uses default when unset.
 *
 * @param params - key and defaultValue
 * @returns Parsed number
 */
export const parseEnvFloat = ({ key, defaultValue }: ParseEnvFloatParams): number => {
    return parseFloat(process.env[key] ?? defaultValue.toString())
}

/**
 * Parse an env var as boolean ("true"/"false", case-insensitive). Uses default when unset.
 *
 * @param params - key and defaultValue
 * @returns Parsed boolean
 */
export const parseEnvBoolean = ({ key, defaultValue }: ParseEnvBooleanParams): boolean => {
    const envValue = process.env[key]
    if (envValue === undefined) return defaultValue
    return envValue.trim().toLowerCase() === "true"
}

/**
 * Read an env var as string. Uses default when unset.
 *
 * @param params - key and defaultValue
 * @returns String value
 */
export const parseEnvString = ({ key, defaultValue }: ParseEnvStringParams): string => {
    return process.env[key] ?? defaultValue
}

/**
 * Parse an env var as duration (ms string, e.g. "10s", "1m"). Returns milliseconds as number.
 *
 * @param params - key and defaultValue (ms string)
 * @returns Duration in milliseconds
 */
export const parseEnvMs = ({ key, defaultValue }: ParseEnvMsParams): number => {
    return parseInt(ms((process.env[key] ?? defaultValue) as ms.StringValue).toString(),
        10)
}

/**
 * Parse an env var as duration (ms string), then return seconds (floored).
 *
 * @param params - key and defaultValue (ms string)
 * @returns Duration in seconds
 */
export const parseEnvSecond = ({ key, defaultValue }: ParseEnvSecondParams): number => {
    const msValue = ms((process.env[key] ?? defaultValue) as ms.StringValue)
    return Math.floor(Number(msValue) / 1000)
}

/**
 * Whether the process is running inside Kubernetes (detected via KUBERNETES_SERVICE_HOST/PORT).
 *
 * @returns True if K8s env vars are set
 */
export const runInKubernetes = (): boolean => {
    return Boolean(process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT)
}