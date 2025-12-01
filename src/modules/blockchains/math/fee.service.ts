import { PrimaryMemoryStorageService } from "@modules/databases"
import { ChainId, Network, toScaledBN } from "@modules/common"
import { Injectable } from "@nestjs/common"
import BN from "bn.js"
import { Decimal } from "decimal.js"

@Injectable()
export class FeeService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }
    
    public splitAmount(
        { 
            amount, 
            network, 
            chainId 
        }: SplitAmountParams
    ): SplitAmountResponse {
        const feePercentage = this.primaryMemoryStorageService.feeConfig.feeInfo?.[chainId]?.[network]?.feeRate
        if (!feePercentage) {
            throw new Error("Fee percentage not found")
        }
        const feeAmount = toScaledBN(amount, new Decimal(feePercentage))
        const remainingAmount = amount.sub(feeAmount)
        return {
            feeAmount,
            remainingAmount,
        }
    }
}

export interface SplitAmountParams {
    amount: BN
    network: Network
    chainId: ChainId
}

export interface SplitAmountResponse {
    feeAmount: BN
    remainingAmount: BN
}