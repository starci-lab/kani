import { Injectable } from "@nestjs/common"
import { TokenId } from "@modules/databases"
import { ChainId, Network } from "@modules/common"
import { PythSuiService } from "./pyth-sui.service"
import { PythSolanaService } from "./pyth-solana.service"
import Decimal from "decimal.js"

export interface FetchPricesParams {
  tokenIds: Array<TokenId>;
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
        chainId,
        network,
    }: FetchPricesParams): Promise<Partial<Record<TokenId, Decimal>>> {
        if (network === Network.Testnet) {
            // do nothing
            return {}
        }
        switch (chainId) {
        case ChainId.Sui:
            return this.suiPythService.fetchPrices(tokenIds)
        case ChainId.Solana:
            return this.solanaPythService.fetchPrices(tokenIds)
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
    }: ComputeOraclePriceParams) {
        const prices = await this.fetchPrices({
            tokenIds: [tokenAId, tokenBId],
            chainId,
            network,
        })
        const tokenAPrice = prices[tokenAId]
        const tokenBPrice = prices[tokenBId]
        if (!tokenAPrice || !tokenBPrice) {
            // we return undefined if the price is not found
            return undefined
        }
        return tokenAPrice.div(tokenBPrice)
    }
}

export interface ComputeOraclePriceParams {
  tokenAId: TokenId;
  tokenBId: TokenId;
  chainId: ChainId;
  network?: Network;
}
