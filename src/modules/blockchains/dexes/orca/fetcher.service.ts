import { Injectable } from "@nestjs/common"
import { IFetchService } from "../../interfaces"

@Injectable()
export class OrcaFetcherService implements IFetchService {
    async fetchPools(): Promise<any> {
        throw new Error("Orca fetchPools not implemented")
    }
}


