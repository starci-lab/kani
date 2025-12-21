import { Injectable } from "@nestjs/common"
import { 
    DexSchema,
    PrimaryMemoryStorageService
} from "@modules/databases"

/**
 * Service that provides static reference data
 * such as DEXes from the in-memory database.
 */
@Injectable()
export class DexesService {
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Return the full list of supported DEXes.
     * Each entry contains metadata about the protocol
     * used for routing and liquidity aggregation.
     */
    dexes(): Array<DexSchema> {
        return this.memoryStorageService.dexes
    }
}

