import { Injectable } from "@nestjs/common"
import { TokenId } from "@modules/databases"
import { PythPriceService } from "./price.service"

@Injectable()
export class PythOraclePriceService {
    constructor(
        private readonly priceService: PythPriceService,
    ) {}

    async getPythOraclePrice(
        { 
            tokenA, 
            tokenB
        }
        : GetPythOraclePriceParams
    ) {
        const priceA = await this.priceService.getPrice({ tokenId: tokenA })
        const priceB = await this.priceService.getPrice({ tokenId: tokenB })
        return priceA.div(priceB)
    }
}

export interface GetPythOraclePriceParams {
    tokenA: TokenId
    tokenB: TokenId
}