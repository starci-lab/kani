/**
 * Coingecko API response structure for token price queries.
 */
export interface CoingeckoTokenPriceResult {
    [coinId: string]: {
        usd: number
    }
}
