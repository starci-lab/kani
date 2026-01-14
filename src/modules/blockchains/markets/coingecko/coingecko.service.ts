import { AxiosService } from "@modules/axios"
import { envConfig } from "@modules/env"
import { Injectable, OnModuleInit } from "@nestjs/common"
import { Interval } from "@nestjs/schedule"
import { AxiosInstance } from "axios"

@Injectable()
export class CoingeckoService implements OnModuleInit {
    private axios: AxiosInstance
    constructor(
        private readonly axiosService: AxiosService,
    ) {}

    onModuleInit() {
        const key = "coingecko"
        this.axios = this.axiosService.create(key)
        this.axiosService.addRetry({ key })
    }

    @Interval(envConfig().timeConfig.interval.coingecko)
    async fetchPrices() {
        const prices = await this.axios.get(
            "https://api.coingecko.com/api/v3/simple/price", {
                params: {
                    ids: "sui",
                    vs_currencies: "usd",
                },
            })
    }
}