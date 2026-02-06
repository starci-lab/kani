import {
    Address
} from "@solana/kit"

/**
 * Parameters for getting event authority PDA.
 */
export interface GetEventAuthorityPdaParams {
    /** Program address. */
    programAddress: Address
}

/**
 * Result of getting event authority PDA.
 */
export interface GetEventAuthorityPdaResult {
    /** Program derived address. */
    pda: Address
}
