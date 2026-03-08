import {
    Injectable 
} from "@nestjs/common"
import {
    AuthenticationConfig 
} from "@modules/databases"
import {
    MountStorageService 
} from "@modules/filesystem"

/**
 * Service that provides static reference data
 * such as authentication config from app config (.mount/config/app.json).
 */
@Injectable()
export class AuthenticationConfigService {
    constructor(
        private readonly mountStorageService: MountStorageService,
    ) {}

    /**
     * Return the authentication config.
     * Contains the list of supported authentication factors.
     */
    authenticationConfig(): AuthenticationConfig {
        return this.mountStorageService.appConfig.authentication as AuthenticationConfig
    }
}
