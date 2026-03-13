import {
    Injectable,
} from "@nestjs/common"
import {
    PriceService 
} from "../../math"
import {
    PrimaryMemoryStorageService,
} from "@modules/databases"

@Injectable()
export class PriceDiagnosticService {
    constructor(
        private readonly priceService: PriceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }
    /**
     * Check if the price is ready.
     *
     * @param token - The token
     * @returns True if the price is ready, false otherwise
     */
    async ready(id: string): Promise<boolean> {
        const token = this.primaryMemoryStorageService.tokenMap.get(id)
        if (!token) return false
        const price = await this.priceService.resolvePrice({
            token
        })
        return !price.isStale
    }
}
