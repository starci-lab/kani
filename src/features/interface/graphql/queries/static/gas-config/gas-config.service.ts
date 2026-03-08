import {
    Injectable 
} from "@nestjs/common"
import {
    GasConfig 
} from "@modules/databases"
import {
    MountStorageService 
} from "@modules/filesystem"

/**
 * Service that provides static reference data
 * such as gas config from app config (.mount/config/app.json).
 */
@Injectable()
export class GasConfigService {
    constructor(
        private readonly mountStorageService: MountStorageService,
    ) {}

    /**
     * Return the gas config.
     * Each entry contains metadata about the protocol
     * used for routing and liquidity aggregation.
     */
    gasConfig(): GasConfig {
        return this.mountStorageService.appConfig.gas as GasConfig
    }
}

