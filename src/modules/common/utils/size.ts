import bytes from "bytes"
/**
 * Estimate the memory usage of an object.
 * @param object - The object to estimate the memory usage of.
 * @returns The memory usage of the object in bytes.
 */
export const estimateMemoryUsage = (object: unknown): string => {
    let result = 0
    // estimate the memory usage of a Map
    if (object instanceof Map) {
        console.log(`Estimating memory usage of Map: ${object.size}`)
        result = estimateMapMemory(object)
    }
    // estimate the memory usage of a Set
    else if (object instanceof Set) {
        result = estimateSetMemory(object)
    }
    // estimate the memory usage of an Array
    else if (object instanceof Array) {
        result = estimateArrayMemory(object)
    }
    // estimate the memory usage of an Object
    else {
        result = estimateObjectMemory(object)
    }
    // return the memory usage in bytes
    return bytes(result,
        {
            unit: "KB"
        }
    ) as string
}

/**
 * Estimate the memory usage of a Map.
 * @param map - The Map to estimate the memory usage of.
 * @returns The memory usage of the Map in bytes.
 */
export const estimateMapMemory = (map: Map<unknown, unknown>): number => {
    const entries = Array.from(map.entries())
    return Buffer.byteLength(JSON.stringify(entries))
}

/**
 * Estimate the memory usage of a Set.
 * @param set - The Set to estimate the memory usage of.
 * @returns The memory usage of the Set in bytes.
 */
export const estimateSetMemory = (set: Set<unknown>): number => {
    const entries = [...set.entries()]
    return Buffer.byteLength(JSON.stringify(entries))
}

/**
 * Estimate the memory usage of an Array.
 * @param array - The Array to estimate the memory usage of.
 * @returns The memory usage of the Array in bytes.
 */
export const estimateArrayMemory = (array: unknown[]): number => {
    return Buffer.byteLength(JSON.stringify(array))
}

/**
 * Estimate the memory usage of an Object.
 * @param object - The Object to estimate the memory usage of.
 * @returns The memory usage of the Object in bytes.
 */
export const estimateObjectMemory = (object: unknown): number => {
    return Buffer.byteLength(JSON.stringify(object))
}