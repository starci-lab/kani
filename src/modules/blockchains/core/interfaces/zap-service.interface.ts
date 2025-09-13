import { ChainId, Network } from "@modules/common"
import { TokenId, TokenLike } from "@modules/databases"
import BN from "bn.js"
import Decimal from "decimal.js"
import { RouterId } from "../swap/swap.interface"

/**
 * Input params for zap calculation
 */
export interface ComputeZapAmountsParams {
    /** Supported chain id */
    chainId?: ChainId

    /** total input (raw units, BN) */
    amountIn: BN

    /** ratio = amountB / amountA */
    ratio: Decimal

    /** spot price (tokenB per tokenA) */
    spotPrice: Decimal

    /** oracle price (optional, tokenB per tokenA) */
    oraclePrice?: Decimal

    /** true: input is tokenA, false: input is tokenB */
    priorityAOverB: boolean

    /** tokenA id */
    tokenAId: TokenId

    /** tokenB id */
    tokenBId: TokenId

    /** tokens */
    tokens: Array<TokenLike>

    /** network */
    network?: Network

    /** swap slippage */
    swapSlippage?: number

    /** slippage */
    slippage?: number
}

/**
 * Output result of zap calculation
 */
export interface ComputeZapAmountsResponse {
    /** amount swapped (raw units) */
    swapAmount: BN

    /** amount remaining after swap (raw units) */
    remainAmount: BN

    /** amount received from swap (raw units) */
    receiveAmount: BN

    /** router id */
    routerId: RouterId
    
    /** price impact, + mean get more, - mean get less */
    priceImpact: Decimal

    /** quote data */
    quoteData?: unknown
}

/**
 * Zap service interface
 */
export interface IZapService {
    computeZapAmounts(params: ComputeZapAmountsParams): Promise<ComputeZapAmountsResponse>
}