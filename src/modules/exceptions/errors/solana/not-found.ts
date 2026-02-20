import type {
    AbstractExceptionMetadata 
} from "../abstract"
import {
    AbstractException 
} from "../abstract"
import type {
    DexId, LiquidityPoolId 
} from "@modules/databases"
import type {
    AccountKind
} from "@modules/blockchains"

/** Metadata when Solana account is not found. */
export interface SolanaAccountNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    kind: AccountKind
    address: string
    dexId: DexId
    liquidityPoolId: LiquidityPoolId
}

/** Thrown when Solana account cannot be found. */
export class SolanaAccountNotFoundException extends AbstractException {
    constructor(
        { kind, address, dexId, liquidityPoolId, originalError }: SolanaAccountNotFoundExceptionMetadata
    ) {
        super(
            "Solana account not found",
            "SOLANA_ACCOUNT_NOT_FOUND_EXCEPTION",
            {
                kind, address, dexId, liquidityPoolId, originalError
            }
        )
    }
}

/** Metadata when Solana minimum balance for rent exemption is not found. */
export interface SolanaMinimumBalanceForRentExemptionNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    dataLength: number
}

/** Thrown when Solana minimum balance for rent exemption cannot be found. */
export class SolanaMinimumBalanceForRentExemptionNotFoundException extends AbstractException {
    constructor(
        { dataLength, originalError }: SolanaMinimumBalanceForRentExemptionNotFoundExceptionMetadata
    ) {
        super(
            "Solana minimum balance for rent exemption not found",
            "SOLANA_MINIMUM_BALANCE_FOR_RENT_EXEMPTION_NOT_FOUND_EXCEPTION",
            {
                dataLength,
                originalError
            }
        )
    }
}