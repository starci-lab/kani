import { Injectable } from "@nestjs/common"
import { IBalanceService } from "./balance.interface"
import { SolanaBalanceService } from "./solana.service"
import { ExecuteBalanceRebalancingParams, ExecuteBalanceRebalancingResponse } from "./balance.interface"
import { ChainId } from "@modules/common"

@Injectable()
export class BalanceService implements IBalanceService {
    constructor(
        private readonly solanaBalanceService: SolanaBalanceService,
    ) {}

    async executeBalanceRebalancing(
        params: ExecuteBalanceRebalancingParams
    ): Promise<ExecuteBalanceRebalancingResponse> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.executeBalanceRebalancing(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }
}