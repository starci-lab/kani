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
    ErrorSolanaAccountName 
} from "./types"

/** Metadata when Solana account is not found. */
export interface SolanaAccountNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    name: ErrorSolanaAccountName
    address: string
    dexId: DexId
    liquidityPoolId: LiquidityPoolId
}

/** Thrown when Solana account cannot be found. */
export class SolanaAccountNotFoundException extends AbstractException {
    constructor(
        { name, address, dexId, liquidityPoolId, originalError }: SolanaAccountNotFoundExceptionMetadata
    ) {
        super(
            "Solana account not found",
            "SOLANA_ACCOUNT_NOT_FOUND_EXCEPTION",
            {
                name, address, dexId, liquidityPoolId, originalError
            }
        )
    }
}