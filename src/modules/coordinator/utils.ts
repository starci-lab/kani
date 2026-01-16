/**
 * Executor name utilities
 * - Use a fixed prefix
 * - Ensure the name ends with a valid MongoDB ObjectId
 * - Provide helpers to create, validate, and parse executor names
 */

// ===== Constants =====

// MongoDB ObjectId: 24 hexadecimal characters
export const MONGO_OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i

// Executor name prefix (shared across the system)
export const EXECUTOR_NAME_PREFIX = "kani-executor-"

// Full executor name validation regex
export const EXECUTOR_NAME_REGEX = /^kani-executor-[a-f0-9]{24}$/i

// ===== Utilities =====

/**
 * Create an executor name from an executorId
 *
 * Example:
 *   createExecutorName("507f1f77bcf86cd799439011")
 *   => "kani-executor-507f1f77bcf86cd799439011"
 */
export const createExecutorName = (executorId: string): string => {
    return `${EXECUTOR_NAME_PREFIX}${executorId}`
}

/**
 * Check whether a given name is a valid, system-created executor name
 *
 * Conditions:
 * - Starts with EXECUTOR_NAME_PREFIX
 * - Ends with a valid MongoDB ObjectId
 */
export const isCreatedExecutorName = (name: string): boolean => {
    return EXECUTOR_NAME_REGEX.test(name)
}

/**
 * Extract executorId from an executor name
 *
 * @param name - executor name to parse
 * @returns executorId if valid, otherwise null
 */
export const parseExecutorId = (name: string): string | null => {
    if (!name.startsWith(EXECUTOR_NAME_PREFIX)) {
        return null
    }

    const idPart = name.slice(EXECUTOR_NAME_PREFIX.length)
    return MONGO_OBJECT_ID_REGEX.test(idPart) ? idPart : null
}
