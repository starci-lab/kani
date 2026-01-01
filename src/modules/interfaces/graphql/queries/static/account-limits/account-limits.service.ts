import { Injectable } from "@nestjs/common"
import { 
    AccountLimitsConfig,
    PrimaryMemoryStorageService
} from "@modules/databases"

/**
 * Service that provides static reference data
 * such as account limits from the in-memory database.
 */
@Injectable()
export class AccountLimitsService {
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Return the full list of supported account limits.
     * Each entry contains metadata about the protocol
     * used for routing and liquidity aggregation.
     */
    accountLimits(): AccountLimitsConfig {
        return this.memoryStorageService.accountLimits
    }
}

