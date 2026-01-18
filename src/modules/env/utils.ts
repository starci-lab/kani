import ms from "ms"

export const parseInt = (value: string, defaultValue: number = 0): number => {
    return parseInt(process.env[value] || defaultValue.toString(),
        10)
}
export const parseFloat = (value: string, defaultValue: number = 0): number => {
    return parseFloat(process.env[value] || defaultValue.toString())
}
export const parseBoolean = (value: string, defaultValue: boolean = false): boolean => {
    return Boolean(process.env[value] || defaultValue)
}
export const parseString = (value: string, defaultValue: string = ""): string => {
    return process.env[value] || defaultValue
}
export const parseMs = (value: string, defaultValue: string = ""): number => {
    return parseInt(ms((process.env[value] || defaultValue) as ms.StringValue).toString(),
        10)
}