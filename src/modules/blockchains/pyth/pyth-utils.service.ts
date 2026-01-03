import { TokenListIsEmptyException } from "@exceptions"
import { Injectable } from "@nestjs/common"
import { PrimaryMemoryStorageService } from "@modules/databases"

@Injectable()
export class PythUtilsService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    getPythIds() {
        const tokens = this.primaryMemoryStorageService.tokens
            .filter(
                token => !!token.pythFeedId
            )
        if (!tokens.length) {
            throw new TokenListIsEmptyException("No Pyth tokens found for mainnet")
        }
        return [...new Set(tokens.map(token => token.pythFeedId!))]
    }
}