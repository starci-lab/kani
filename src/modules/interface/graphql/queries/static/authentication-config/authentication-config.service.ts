import {
    Injectable 
} from "@nestjs/common"
import { 
    AuthenticationConfig,
    PrimaryMemoryStorageService
} from "@modules/databases"


/**
 * Service that provides static reference data
 * such as authentication config from the in-memory database.
 */
@Injectable()
export class AuthenticationConfigService {
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Return the authentication config.
     * Contains the list of supported authentication factors.
     */
    authenticationConfig(): AuthenticationConfig {
        return this.memoryStorageService.authenticationConfig
    }
}
