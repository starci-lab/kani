import {
    AbstractException, AbstractExceptionMetadata
} from "../abstract"
import {
    ErrorSolanaAccountName
} from "./types"

/** Thrown when Sui object is not found */
export interface SolanaAccountNotFoundExceptionMetadata extends AbstractExceptionMetadata {
    name: ErrorSolanaAccountName
    address: string
    dexId: string
    liquidityPoolId: string
}
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