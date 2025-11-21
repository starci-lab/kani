import { Injectable } from "@nestjs/common"
import { 
    FetchBalanceParams, 
    FetchBalanceResponse, 
    FetchBalancesParams, 
    FetchBalancesResponse, 
    IBalanceService 
} from "./balance.interface"
import { SolanaBalanceService } from "./solana.service"
import { ExecuteBalanceRebalancingParams } from "./balance.interface"
import { ChainId } from "@modules/common"

@Injectable()
export class BalanceService implements IBalanceService {
    constructor(
        private readonly solanaBalanceService: SolanaBalanceService,
    ) {}

    async executeBalanceRebalancing(
        params: ExecuteBalanceRebalancingParams
    ): Promise<void> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.executeBalanceRebalancing(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }

    public async fetchBalances(
        params: FetchBalancesParams
    ): Promise<FetchBalancesResponse> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.fetchBalances(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }

    public async fetchBalance(
        params: FetchBalanceParams
    ): Promise<FetchBalanceResponse> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.fetchBalance(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }
}