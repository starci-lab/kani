import { Injectable } from "@nestjs/common"

@Injectable()
export class SolanaSwapService {
    constructor() { }

    async fetchBalance(params: FetchBalanceParams): Promise<FetchBalanceResponse> {
        const { accountAddress, tokenId } = params
        const balance = await this.solanaClient.getBalance(accountAddress)
        return {
            balance,
        }
    }

}