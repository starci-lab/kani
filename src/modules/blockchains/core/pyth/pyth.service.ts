import { Injectable } from "@nestjs/common"
import { TokenId, TokenLike } from "@modules/databases"
import { ChainId } from "@modules/common"
import { PythSuiService } from "./pyth-sui.service"
import { PythSolanaService } from "./pyth-solana.service"
import Decimal from "decimal.js"

@Injectable()
export class PythService {
    constructor(
        private readonly suiPythService: PythSuiService,
        private readonly solanaPythService: PythSolanaService,
    ) {}

    async fetchPrices(
        tokenIds: Array<TokenId>,
        tokens: Array<TokenLike>,
        chainId: ChainId
    ): Promise<Partial<Record<TokenId, Decimal>>> {
        switch (chainId) {
        case ChainId.Sui:
            return this.suiPythService.fetchPrices(tokenIds, tokens)
        case ChainId.Solana:
            return this.solanaPythService.fetchPrices(tokenIds, tokens)
        default:
            throw new Error(`Unsupported chainId: ${chainId}`)
        }
    }
}