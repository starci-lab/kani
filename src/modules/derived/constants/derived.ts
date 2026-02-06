/** Derived key length in bytes (e.g. for AES-256). */
export const KEY_LENGTH = 32

/** PBKDF2 iteration count for key derivation. */
export const PBKDF2_ITERATIONS = 100_000

/** Hash algorithm used for PBKDF2. */
export const PBKDF2_DIGEST = "sha256" as const
