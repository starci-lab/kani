import {
    AbstractException 
} from "../abstract"
import {
    ErrorSolanaAccountName 
} from "./types"
import {
    DexId, LiquidityPoolId 
} from "@modules/databases"

/** Thrown when Sui object is not found */
export interface SolanaAccountNotFoundExceptionMetadata {
    name: ErrorSolanaAccountName
    address: string
    dexId: DexId
    liquidityPoolId: LiquidityPoolId
}
export class SolanaAccountNotFoundException extends AbstractException {
    constructor(
        { name, address, dexId, liquidityPoolId }: SolanaAccountNotFoundExceptionMetadata
    ) {
        super(
            "SOLANA_OBJECT_NOT_FOUND_EXCEPTION", 
            "SOLANA_OBJECT_NOT_FOUND_EXCEPTION", 
            {
                name, address, dexId, liquidityPoolId 
            }
        )
    }
}