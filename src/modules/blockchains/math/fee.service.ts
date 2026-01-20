
import {
    ChainId 
} from "@modules/typedefs"
import {
    bnMulDecimal
} from "@modules/utils"
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
import {
    FeeRateNotFoundException 
} from "@exceptions"

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
            throw new FeeRateNotFoundException({
            })
        }
        const feeAmount = bnMulDecimal(
            {
                bn: amount,
                decimal: new Decimal(feeRate),
            }
        )
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