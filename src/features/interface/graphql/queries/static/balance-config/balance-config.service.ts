import {
    Injectable 
} from "@nestjs/common"
import {
    BalanceConfig 
} from "@modules/databases"
import {
    MountStorageService 
} from "@modules/filesystem"

/**
 * Service that provides static reference data
 * such as balance config from app config (.mount/config/app.json).
 */
@Injectable()
export class BalanceConfigService {
    constructor(
        private readonly mountStorageService: MountStorageService,
    ) {}

    /**
     * Return the balance config.
     * Each entry contains the minimum required amount in USD for each chain.
     */
    balanceConfig(): BalanceConfig {
        return this.mountStorageService.appConfig.balance
    }
}

