import {
    bnMulDecimal
} from "@modules/utils"
import {
    Injectable 
} from "@nestjs/common"
import {
    Decimal 
} from "decimal.js"
import {
    MountStorageService 
} from "@modules/filesystem"
import {
    FeeRateNotFoundException 
} from "@modules/exceptions"
import {
    SplitAmountParams,
    SplitAmountResult
} from "./types/fee"

/**
 * Service responsible for fee calculations.
 * Handles splitting amounts into fee and remaining portions.
 *
 * @example
 * const service = new FeeService(...)
 * const result = service.splitAmount({ amount, chainId })
 */
@Injectable()
export class FeeService {
    constructor(
        private readonly mountStorageService: MountStorageService,
    ) {}
    
    /**
     * Splits an amount into fee amount and remaining amount.
     * Calculates fee based on configured fee rate for the chain.
     *
     * @param param - Parameters for splitting amount
     * @param param.amount - Total amount to split
     * @param param.chainId - Chain identifier
     * @returns Split result with fee amount and remaining amount
     *
     * @example
     * const result = service.splitAmount({ amount: new BN(1000), chainId: ChainId.Sui })
     */
    public splitAmount({
        amount,
        chainId
    }: SplitAmountParams): SplitAmountResult {
        // get fee rate from config
        const feeRate = this.mountStorageService.appConfig.fees.openPosition[chainId].feeRate
        if (!feeRate) {
            throw new FeeRateNotFoundException({
            })
        }
        
        // calculate fee amount
        const feeAmount = bnMulDecimal({
            bn: amount,
            decimal: new Decimal(feeRate),
        })
        
        // calculate remaining amount after fee
        const remainingAmount = amount.sub(feeAmount)
        
        return {
            feeAmount,
            remainingAmount,
        }
    }
}