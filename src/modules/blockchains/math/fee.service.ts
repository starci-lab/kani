
import {
    ChainId 
} from "@typedefs"
import {
    toScaledBN 
} from "@utils"
import {
    Injectable 
} from "@nestjs/common"
import BN from "bn.js"
import {
    Decimal 
} from "decimal.js"
import {
    MountStorageService 
} from "@modules/filesystem"

@Injectable()
export class FeeService {
    constructor(
        private readonly mountStorageService: MountStorageService,
    ) { }
    
    public splitAmount(
        { 
            amount, 
            chainId 
        }: SplitAmountParams
    ): SplitAmountResult {
        const feeRate = this.mountStorageService.appConfig.fees.openPosition[chainId].feeRate
        if (!feeRate) {
            throw new Error("Fee rate not found")
        }
        const feeAmount = toScaledBN(amount,
            new Decimal(feeRate))
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

export interface SplitAmountResult {
    feeAmount: BN
    remainingAmount: BN
}