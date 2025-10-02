import { Injectable } from "@nestjs/common"
import { TokenId } from "@modules/databases"
import { ChainId, Network } from "@modules/common"
import { PythSuiService } from "./pyth-sui.service"
import Decimal from "decimal.js"
import { AsyncService } from "@modules/mixin"

export interface GetPricesParams {
  tokenIds: Array<TokenId>;
  chainId: ChainId;
  network?: Network;
}

@Injectable()
export class PythService {
    constructor(
        private readonly suiPythService: PythSuiService,
        private readonly asyncService: AsyncService,
    ) {}

    async getPrices({
        tokenIds,
        chainId,
        network,
    }: GetPricesParams): Promise<Partial<Record<TokenId, Decimal>>> {
        if (network === Network.Testnet) {
            // do nothing
            return {}
        }
        switch (chainId) {
        case ChainId.Sui: {
            return this.suiPythService.getPrices(tokenIds)
        }
        case ChainId.Solana: {
            // temporarily disabled
            return {}
        }
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
        const prices = await this.getPrices({
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
