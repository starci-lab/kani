import { Injectable } from "@nestjs/common"
import { 
    LiquidityPoolSchema,
    PrimaryMemoryStorageService
} from "@modules/databases"

/**
 * Service that provides static reference data
 * such as liquidity pools from the in-memory database.
 */
@Injectable()
export class LiquidityPoolsService {
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Return the full list of supported liquidity pools.
     * These include pool metadata such as token pairs,
     * fee tiers, tick spacing, and pool identifiers.
     */
    liquidityPools(): Array<LiquidityPoolSchema> {
        return this.memoryStorageService.liquidityPools
    }
}

