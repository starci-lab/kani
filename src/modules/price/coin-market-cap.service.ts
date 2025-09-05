import { Injectable } from "@nestjs/common"
import { AxiosService } from "@modules/axios"

@Injectable()
export class CoinMarketCapService {
    constructor(private readonly axiosService: AxiosService) {}

    async getPrice(symbol: string) {
    }
}