import {
    Injectable 
} from "@nestjs/common"
import { 
    TokenSchema,
    PrimaryMemoryStorageService
} from "@modules/databases"

/**
 * Service that provides static reference data
 * such as tokens from the in-memory database.
 */
@Injectable()
export class TokensService {
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
    ) {}

    /**
     * Return the full list of supported tokens.
     * These are loaded from the in-memory database
     * and typically represent static registry data.
     */
    tokens(): Array<TokenSchema> {
        return this.memoryStorageService.tokenCollection.chain().find().data({
            removeMeta: true,
        })
    }
}

