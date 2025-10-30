import { Injectable } from "@nestjs/common"
import { IFetchService } from "../../interfaces"

@Injectable()
export class MeteoraFetcherService implements IFetchService {
    async fetchPools(): Promise<any> {
        throw new Error("Meteora fetchPools not implemented")
    }
}


