import {
    Injectable 
} from "@nestjs/common"
import {
    AccountLimitsConfig 
} from "@modules/databases"
import {
    MountStorageService 
} from "@modules/filesystem"

/**
 * Service that provides static reference data
 * such as account limits from app config (.mount/config/app.json).
 */
@Injectable()
export class AccountLimitsService {
    constructor(
        private readonly mountStorageService: MountStorageService,
    ) {}

    /**
     * Return the full list of supported account limits.
     * Each entry contains metadata about the protocol
     * used for routing and liquidity aggregation.
     */
    accountLimits(): AccountLimitsConfig {
        return this.mountStorageService.appConfig.accountLimits
    }
}

