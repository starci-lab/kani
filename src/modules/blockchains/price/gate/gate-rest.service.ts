import { Injectable } from "@nestjs/common"
import { AxiosService } from "@modules/axios"
import type { Axios } from "axios"

export interface GateOrderBook {
  bids: Array<[string, string]>
  asks: Array<[string, string]>
}

export interface GatePriceResponse {
  symbol: string
  price: number
}

@Injectable()
export class GateRestService {
    private readonly restBase = "https://api.gateio.ws/api/v4"
    private readonly axios: Axios

    constructor(private readonly axiosService: AxiosService) {
        this.axios = this.axiosService.create("gate-rest")
    }

    /**
   * Get latest spot price for a single symbol
   */
    async getPrice(symbol: string): Promise<GatePriceResponse> {
        const { data } = await this.axios.get(
            `${this.restBase}/spot/tickers`,
            { params: { currency_pair: symbol } }
        )
        const first = (data as Array<{ currency_pair: string; last: string }>)[0]
        return { symbol: first.currency_pair, price: parseFloat(first.last) }
    }

    /**
   * Get order book snapshot
   */
    async getOrderBook(symbol: string, limit = 20): Promise<GateOrderBook> {
        const { data } = await this.axios.get(
            `${this.restBase}/spot/order_book`,
            { params: { currency_pair: symbol, limit } }
        )
        return data
    }
}


