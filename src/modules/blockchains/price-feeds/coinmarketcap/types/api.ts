/**
 * CoinMarketCap API response structure for token price queries.
 */
export interface CoinMarketCapTokenPriceResult {
    data: {
        [symbol: string]: {
            quote: {
                USD: {
                    price: number
                }
            }
        }
    }
}
