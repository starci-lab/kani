import ms from "ms"

export const parseEnvInt = (value: string, defaultValue: number = 0): number => {
    return parseInt(process.env[value] || defaultValue.toString(),
        10)
}
export const parseEnvFloat = (value: string, defaultValue: number = 0): number => {
    return parseFloat(process.env[value] || defaultValue.toString())
}
export const parseEnvBoolean = (value: string, defaultValue: boolean = false): boolean => {
    const envValue = process.env[value]
    if (envValue === undefined) return defaultValue
    return envValue.trim().toLowerCase() === "true"
}
export const parseEnvString = (value: string, defaultValue: string = ""): string => {
    return process.env[value] || defaultValue
}
export const parseEnvMs = (value: string, defaultValue: string = ""): number => {
    return parseInt(ms((process.env[value] || defaultValue) as ms.StringValue).toString(),
        10)
}