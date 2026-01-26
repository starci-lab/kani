import {
    Injectable 
} from "@nestjs/common"
import { 
    GasConfig,
    PrimaryMemoryStorageService
} from "@modules/databases"

/**
 * Service that provides static reference data
 * such as gas config from the in-memory database.
 */
@Injectable()
export class GasConfigService {
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Return the gas config.
     * Each entry contains metadata about the protocol
     * used for routing and liquidity aggregation.
     */
    gasConfig(): GasConfig {
        return this.memoryStorageService.gasConfig
    }
}

