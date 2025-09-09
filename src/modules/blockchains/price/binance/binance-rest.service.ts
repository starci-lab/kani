import { Injectable } from "@nestjs/common"
import { AxiosService } from "@modules/axios"
import { Axios } from "axios"

/**
 * Order book snapshot type: list of [price, quantity]
 */
export interface OrderBook {
  bids: Array<[string, string]>
  asks: Array<[string, string]>
}

/**
 * Binance price response type
 */
export interface PriceResponse {
  symbol: string
  price: number
}

/**
 * Binance REST API service
 */
@Injectable()
export class BinanceRestService {
    private readonly restBase = "https://api.binance.com/api/v3"
    private readonly axios: Axios

    constructor(private readonly axiosService: AxiosService) {
        this.axios = this.axiosService.create("binance-rest")
    }

    /**
   * Get latest spot prices for multiple symbols
   * @param symbols Array of trading pair symbols, e.g. ["SUIUSDT", "BTCUSDT"]
   */
    async getPrices(symbols: Array<string>): Promise<PriceResponse[]> {
        const { data } = await this.axios.get(`${this.restBase}/ticker/price`)

        return (data as Array<{ symbol: string; price: string }>)
            .filter((item) => symbols.includes(item.symbol))
            .map((item) => ({
                symbol: item.symbol,
                price: parseFloat(item.price),
            }))
    }

    /**
   * Get latest spot price for a single symbol
   * @param symbol Trading pair symbol, e.g. "BTCUSDT"
   */
    async getPrice(symbol: string): Promise<PriceResponse> {
        const { data } = await this.axios.get(`${this.restBase}/ticker/price`, {
            params: { symbol },
        })

        return {
            symbol: data.symbol,
            price: parseFloat(data.price),
        }
    }

    /**
   * Get order book snapshot
   * @param symbol Trading pair symbol
   * @param limit Number of levels (default 20)
   */
    async getOrderBook(symbol: string, limit = 20): Promise<OrderBook> {
        const { data } = await this.axios.get(`${this.restBase}/depth`, {
            params: { symbol, limit },
        })
        return data
    }
}