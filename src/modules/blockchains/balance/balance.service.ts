import { Injectable } from "@nestjs/common"
import { IBalanceService } from "./balance.interface"
import { SolanaBalanceService } from "./solana.service"
import { EvaluateBotBalancesParams, EvaluateBotBalancesResponse } from "./balance.interface"
import { ChainId } from "@modules/common"

@Injectable()
export class BalanceService implements IBalanceService {
    constructor(
        private readonly solanaBalanceService: SolanaBalanceService,
    ) {}

    async evaluateBotBalances(
        params: EvaluateBotBalancesParams
    ): Promise<EvaluateBotBalancesResponse> {
        switch (params.bot.chainId) {
        case ChainId.Solana:
            return this.solanaBalanceService.evaluateBotBalances(params)
        default:
            throw new Error(`Unsupported chain id: ${params.bot.chainId}`)
        }
    }
}