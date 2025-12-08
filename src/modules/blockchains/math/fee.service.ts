import { PrimaryMemoryStorageService } from "@modules/databases"
import { ChainId } from "@typedefs"
import { toScaledBN } from "@utils"
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
            chainId 
        }: SplitAmountParams
    ): SplitAmountResponse {
        const feePercentage = this.primaryMemoryStorageService.feeConfig.feeInfo?.[chainId]?.feeRate
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
    chainId: ChainId
}

export interface SplitAmountResponse {
    feeAmount: BN
    remainingAmount: BN
}