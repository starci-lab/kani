/**
 * Params for env parsing utilities (convention: {ActionName}Params).
 */

/** Params for parsing an env var as string. */
export interface ParseEnvStringParams {
    key: string
    defaultValue: string
}

/** Params for parsing an env var as integer. */
export interface ParseEnvIntParams {
    key: string
    defaultValue: number
}

/** Params for parsing an env var as float. */
export interface ParseEnvFloatParams {
    key: string
    defaultValue: number
}

/** Params for parsing an env var as boolean. */
export interface ParseEnvBooleanParams {
    key: string
    defaultValue: boolean
}

/** Params for parsing an env var as duration (ms string). */
export interface ParseEnvMsParams {
    key: string
    defaultValue: string
}

/** Params for parsing an env var as duration (seconds). */
export interface ParseEnvSecondParams {
    key: string
    defaultValue: string
}
