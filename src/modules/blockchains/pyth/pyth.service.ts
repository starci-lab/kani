import { Injectable } from "@nestjs/common"
import { TokenId, TokenLike } from "@modules/databases"
import { ChainId, Network } from "@modules/common"
import { PythSuiService } from "./pyth-sui.service"
import { PythSolanaService } from "./pyth-solana.service"
import Decimal from "decimal.js"

export interface FetchPricesParams {
  tokenIds: Array<TokenId>;
  tokens: Array<TokenLike>;
  chainId: ChainId;
  network?: Network;
}

@Injectable()
export class PythService {
    constructor(
    private readonly suiPythService: PythSuiService,
    private readonly solanaPythService: PythSolanaService,
    ) {}

    async fetchPrices({
        tokenIds,
        tokens,
        chainId,
        network,
    }: FetchPricesParams): Promise<Partial<Record<TokenId, Decimal>>> {
        if (network === Network.Testnet) {
            // do nothing
            return {}
        }
        switch (chainId) {
        case ChainId.Sui:
            return this.suiPythService.fetchPrices(tokenIds, tokens)
        case ChainId.Solana:
            return this.solanaPythService.fetchPrices(tokenIds, tokens)
        default:
        // do nothing
            return {}
        }
    }

    async computeOraclePrice({
        tokenAId,
        tokenBId,
        chainId,
        network,
        tokens,
    }: ComputeOraclePriceParams) {
        const prices = await this.fetchPrices({
            tokenIds: [tokenAId, tokenBId],
            tokens,
            chainId,
            network,
        })
        const tokenAPrice = prices[tokenAId]
        const tokenBPrice = prices[tokenBId]
        if (!tokenAPrice || !tokenBPrice) {
            throw new Error("Token not found")
        }
        return tokenAPrice.div(tokenBPrice)
    }
}

export interface ComputeOraclePriceParams {
  tokenAId: TokenId;
  tokenBId: TokenId;
  chainId: ChainId;
  network?: Network;
  tokens: Array<TokenLike>
}
