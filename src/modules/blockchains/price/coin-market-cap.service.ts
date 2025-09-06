import { Injectable } from "@nestjs/common"
import { AxiosService } from "@modules/axios"
import { AxiosInstance } from "axios"
import { envConfig } from "@modules/env"

export interface CoinMarketCapPriceResponse {
    id?: string
    symbol?: string
    currency: string
    price: number | null
}

@Injectable()
export class CoinMarketCapService {
    private axios: AxiosInstance
    constructor(
        private readonly axiosService: AxiosService
    ) {
        this.axios = this.axiosService.create("coin-market-cap", {
            baseURL: "https://pro-api.coinmarketcap.com/v1",
            timeout: 5000,
            headers: {
                "X-CMC_PRO_API_KEY": envConfig().coinMarketCap.apiKey,
            },
        })
    }

    async getPricesById(
        ids: Array<string>,
        vsCurrency = "USD",
    ): Promise<Array<CoinMarketCapPriceResponse>> {
        const { data } = await this.axios.get("/cryptocurrency/quotes/latest", {
            params: {
                id: ids.join(","), // eg. "20947,5426"
                convert: vsCurrency,
            },
        })
    
        return ids.map((id) => ({
            id,
            currency: vsCurrency,
            price: data.data[id]?.quote?.[vsCurrency]?.price ?? null,
        }))
    }
    
    async getPricesBySymbol(
        symbols: Array<string>,
        vsCurrency = "USD",
    ): Promise<Array<CoinMarketCapPriceResponse>> {
        const upperCaseSymbols = symbols.map((symbol) => symbol.toUpperCase())
        const { data } = await this.axios.get("/cryptocurrency/quotes/latest", {
            params: {
                symbol: upperCaseSymbols.join(","), // eg. "SUI,BTC"
                convert: vsCurrency,
            },
        })
        return upperCaseSymbols.map((symbol) => ({
            symbol,
            currency: vsCurrency,
            price: data.data[symbol]?.quote?.[vsCurrency]?.price ?? null,
        }))
    }
}   