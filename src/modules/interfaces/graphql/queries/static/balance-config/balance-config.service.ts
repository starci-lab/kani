import {
    Injectable 
} from "@nestjs/common"
import { 
    PrimaryMemoryStorageService,
    BalanceConfig
} from "@modules/databases"


/**
 * Service that provides static reference data
 * such as gas config from the in-memory database.
 */
@Injectable()
export class BalanceConfigService {
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Return the balance config.
     * Each entry contains the minimum required amount in USD for each chain.
     */
    balanceConfig(): BalanceConfig {
        return this.memoryStorageService.balanceConfig
    }
}

