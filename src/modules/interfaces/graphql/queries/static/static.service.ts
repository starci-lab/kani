import { Injectable } from "@nestjs/common"
import { 
    DexSchema, 
    LiquidityPoolSchema, 
    TokenSchema,
    PrimaryMemoryStorageService
} from "@modules/databases"

/**
 * Service that provides static reference data
 * such as tokens, liquidity pools, and DEX metadata
 * from the in-memory database.
 */
@Injectable()
export class StaticService {
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Return the full list of supported tokens.
     * These are loaded from the in-memory database
     * and typically represent static registry data.
     */
    tokens(): Array<TokenSchema> {
        return this.memoryStorageService.tokens
    }

    /**
     * Return the full list of supported liquidity pools.
     * These include pool metadata such as token pairs,
     * fee tiers, tick spacing, and pool identifiers.
     */
    liquidityPools(): Array<LiquidityPoolSchema> {
        return this.memoryStorageService.liquidityPools
    }

    /**
     * Return the full list of supported DEXes.
     * Each entry contains metadata about the protocol
     * used for routing and liquidity aggregation.
     */
    dexes(): Array<DexSchema> {
        return this.memoryStorageService.dexes
    }
}