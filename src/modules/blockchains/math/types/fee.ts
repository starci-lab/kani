import BN from "bn.js"
import {
    ChainId
} from "@modules/common"

/** Parameters for splitting amount into fee and remaining. */
export interface SplitAmountParams {
    amount: BN
    chainId: ChainId
}

/** Result of splitting amount. */
export interface SplitAmountResult {
    feeAmount: BN
    remainingAmount: BN
}
