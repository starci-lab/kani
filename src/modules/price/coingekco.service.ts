import { Injectable } from "@nestjs/common"
import { AxiosService } from "@modules/axios"
import { AxiosInstance } from "axios"

export interface CoinGeckoPriceResponse {
    id: string
    currency: string
    price: number | null
}

@Injectable()
export class CoinGeckoService {
    private axios: AxiosInstance
    constructor(
        private readonly axiosService: AxiosService
    ) {
        this.axios = this.axiosService.create("coin-gecko", {
            baseURL: "https://api.coingecko.com/api/v3",
            timeout: 5000,
        })
    }
    
    async getPrices(
        ids: Array<string>,
        vsCurrency = "usd"
    ): Promise<Array<CoinGeckoPriceResponse>> {
        const { data } = await this.axios.get("/simple/price", {
            params: {
                ids: ids.join(","),        // "sui,bitcoin,ethereum"
                vs_currencies: vsCurrency, // "usd"
            },
        })
    
        return ids.map((id) => ({
            id,
            currency: vsCurrency,
            price: data[id]?.[vsCurrency] ?? null,
        }))
    }
}