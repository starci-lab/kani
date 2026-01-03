import { Injectable } from "@nestjs/common"
import { TokenId } from "@modules/databases"
import { PythPriceService } from "./price.service"

@Injectable()
export class PythOraclePriceService {
    constructor(
        private readonly pythPriceService: PythPriceService,
    ) {}

    async getPythOraclePrice(
        { 
            tokenA, 
            tokenB
        }
        : GetPythOraclePriceParams
    ) {
        const { price: priceA } = await this.pythPriceService.getPrice({ tokenId: tokenA })
        const { price: priceB } = await this.pythPriceService.getPrice({ tokenId: tokenB })
        return priceA.div(priceB)
    }
}

export interface GetPythOraclePriceParams {
    tokenA: TokenId
    tokenB: TokenId
}