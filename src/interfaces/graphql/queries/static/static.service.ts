import { Injectable } from "@nestjs/common"
import { 
    DexSchema, 
    LiquidityPoolSchema, 
    MemDbService, 
    TokenSchema 
} from "@modules/databases"

/**
 * Service that provides static reference data
 * such as tokens, liquidity pools, and DEX metadata
 * from the in-memory database.
 */
@Injectable()
export class StaticService {
    constructor(
        private readonly memDbService: MemDbService,
    ) {}

    /**
     * Return the full list of supported tokens.
     * These are loaded from the in-memory database
     * and typically represent static registry data.
     */
    tokens(): Array<TokenSchema> {
        return this.memDbService.tokens
    }

    /**
     * Return the full list of supported liquidity pools.
     * These include pool metadata such as token pairs,
     * fee tiers, tick spacing, and pool identifiers.
     */
    liquidityPools(): Array<LiquidityPoolSchema> {
        return this.memDbService.liquidityPools
    }

    /**
     * Return the full list of supported DEXes.
     * Each entry contains metadata about the protocol
     * used for routing and liquidity aggregation.
     */
    dexes(): Array<DexSchema> {
        return this.memDbService.dexes
    }
}