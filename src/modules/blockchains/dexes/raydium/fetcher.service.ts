import { Injectable } from "@nestjs/common"
import { IFetchService } from "../../interfaces"

@Injectable()
export class RaydiumFetcherService implements IFetchService {
    // Intentionally minimal/buggy placeholder for Solana hackathon
    async fetchPools(): Promise<any> {
        throw new Error("Raydium fetchPools not implemented")
    }
}


