import { Injectable } from "@nestjs/common"
import { AxiosService } from "@modules/axios"
import type { Axios } from "axios"

export interface BybitOrderBook {
  b: Array<[string, string]>
  a: Array<[string, string]>
}

export interface BybitPriceResponse {
  symbol: string
  price: number
}

@Injectable()
export class BybitRestService {
    private readonly restBase = "https://api.bybit.com/spot/v3/public"
    private readonly axios: Axios

    constructor(private readonly axiosService: AxiosService) {
        this.axios = this.axiosService.create("bybit-rest")
    }

    /**
   * Get latest spot prices for multiple symbols
   * Bybit uses symbols like "SUIUSDT"
   */
    async getPrices(symbols: Array<string>): Promise<BybitPriceResponse[]> {
        const { data } = await this.axios.get(`${this.restBase}/ticker/price`) // returns all
        const list = (data?.result?.list ?? []) as Array<{ symbol: string; lastPrice: string }>
        return list
            .filter((item) => symbols.includes(item.symbol))
            .map((item) => ({ symbol: item.symbol, price: parseFloat(item.lastPrice) }))
    }

    async getPrice(symbol: string): Promise<BybitPriceResponse> {
        const { data } = await this.axios.get(`${this.restBase}/ticker/price`, {
            params: { symbol },
        })
        const first = (data?.result?.list ?? [])[0] as { symbol: string; lastPrice: string }
        return { symbol: first.symbol, price: parseFloat(first.lastPrice) }
    }

    async getOrderBook(symbol: string, limit = 20): Promise<BybitOrderBook> {
        const { data } = await this.axios.get(`${this.restBase}/quote/depth`, {
            params: { symbol, limit },
        })
        // Response has bids/asks arrays of [price, size]
        return data?.result as BybitOrderBook
    }
}


