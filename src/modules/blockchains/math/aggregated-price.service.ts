import { 
    CachePriceUtilsService,
} from "@modules/cache"
import { MarketId, TokenId } from "@modules/databases"
import { Injectable } from "@nestjs/common"
import Decimal from "decimal.js"
import { envConfig } from "@modules/env"
import { DayjsService } from "@modules/mixin"
import { AggregatedTokenPriceNotFoundException } from "@exceptions"

@Injectable()
export class AggregatedPriceService {
    constructor(
        private readonly cachePriceUtilsService: CachePriceUtilsService,
        private readonly dayjsService: DayjsService,
    ) {}

    async price(
        {
            tokenId,
        }: PriceParams,
    ): Promise<PriceResult> {
        const aggregated = await this.cachePriceUtilsService.getAggregatedTokenPrice(tokenId)
        const marketPreference: Array<MarketId> = [
            MarketId.Pyth,
            MarketId.Coingecko,
            MarketId.CoinMarketCap,
            MarketId.Binance,
            MarketId.Bybit,
            MarketId.Gate,
        ]
        const chosen = marketPreference
            .map((marketId) => aggregated.prices?.[marketId])
            .find(Boolean)

        if (!chosen) {
            throw new AggregatedTokenPriceNotFoundException(tokenId)
        }

        const ageMs = this.dayjsService.now().diff(chosen.snapshotAt, "millisecond")
        return {
            value: new Decimal(chosen.price),
            isStale: ageMs > envConfig().cache.stale.priceMaxAgeMs,
        }
    }
}

export interface PriceParams {
    tokenId: TokenId
}

export interface PriceResult {
    value: Decimal
    isStale: boolean
}