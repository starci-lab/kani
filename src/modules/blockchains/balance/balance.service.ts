import { Injectable } from "@nestjs/common"
import { 
    FetchBalanceParams, 
    FetchBalanceResponse, 
    FetchBalancesParams, 
    FetchBalancesResponse, 
    IBalanceService,
    ExecuteBalanceRebalancingResponse,
} from "./balance.interface"
import { SolanaBalanceService } from "./solana.service"
import { ExecuteBalanceRebalancingParams } from "./balance.interface"
import { ChainId } from "@modules/common"
import { PrimaryMemoryStorageService } from "@modules/databases"

@Injectable()
export class BalanceService implements IBalanceService {
    constructor(
        private readonly solanaBalanceService: SolanaBalanceService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    async executeBalanceRebalancing(
        params: ExecuteBalanceRebalancingParams
    ): Promise<ExecuteBalanceRebalancingResponse> {
        // currently in a position, we skip the balance rebalancing
        if (params.bot.activePosition) {
            return {}
        }
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