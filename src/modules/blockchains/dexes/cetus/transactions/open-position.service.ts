import { asUintN } from "@cetusprotocol/cetus-sui-clmm-sdk"
import { LiquidityPoolState } from "../../../interfaces"
import { BotSchema, CetusLiquidityPoolMetadata, LoadBalancerName, PrimaryMemoryStorageService } from "@modules/databases"
import { Transaction } from "@mysten/sui/transactions"
import { Injectable } from "@nestjs/common"
import { InvalidPoolTokensException } from "src/exceptions/tokens"
import Decimal from "decimal.js"
import { FeeToAddressNotFoundException, TargetOperationalGasAmountNotFoundException } from "@exceptions"
import { FeeService } from "../../../math"
import { SelectCoinsService } from "../../../tx-builder"
import BN from "bn.js"
import { ChainId } from "@typedefs"
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"

@Injectable()
export class OpenPositionTxbService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly feeService: FeeService,
        private readonly selectCoinsService: SelectCoinsService,
    ) {}

    async createOpenPositionTxb(
        {
            txb,
            state,
            tickLower,
            tickUpper,
            amountAMax,
            amountBMax,
            bot,
        }: CreateOpenPositionTxbParams
    ): Promise<CreateOpenPositionTxbResponse> {
        txb = txb ?? new Transaction()
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenA.toString()
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenB.toString()
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
        const feeToAddress = this.primaryMemoryStorageService.feeConfig.feeInfo?.[bot.chainId]?.feeToAddress
        if (!feeToAddress) {
            throw new FeeToAddressNotFoundException("Fee to address not found")
        }
        const {
            feeAmount: feeAmountA,
            remainingAmount: remainingAmountA,
        } = this.feeService.splitAmount({
            amount: amountAMax,
            chainId: bot.chainId,
        })
        const {
            feeAmount: feeAmountB,
            remainingAmount: remainingAmountB,
        } = this.feeService.splitAmount({
            amount: amountBMax,
            chainId: bot.chainId,
        })
        // we check balances of tokenA and tokenB
        const targetOperationalAmount = this.primaryMemoryStorageService.
            gasConfig.
            gasAmountRequired[ChainId.Sui]?.
            targetOperationalAmount
        if (!targetOperationalAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                ChainId.Sui,
                "Target operational gas amount not found"
            )
        }
        const { 
            sourceCoin: sourceCoinA 
        } = await this.selectCoinsService.fetchAndMergeCoins(
            {
                loadBalancerName: LoadBalancerName.CetusClmm,
                txb,
                owner: bot.accountAddress,
                coinType: tokenA.tokenAddress,
                requiredAmount: amountAMax,
                suiGasAmount: new BN(targetOperationalAmount),
            })
        const { 
            sourceCoin: sourceCoinB 
        } = await this.selectCoinsService.fetchAndMergeCoins(
            {
                loadBalancerName: LoadBalancerName.CetusClmm,
                txb,
                owner: bot.accountAddress,
                coinType: tokenB.tokenAddress,
                requiredAmount: amountBMax,
                suiGasAmount: new BN(targetOperationalAmount),
            })
        const { spendCoin: feeCoinA } = this.selectCoinsService.splitCoin({
            txb,
            sourceCoin: sourceCoinA,
            requiredAmount: feeAmountA,
        })
        const { spendCoin: feeCoinB } = this.selectCoinsService.splitCoin({
            txb,
            sourceCoin: sourceCoinB,
            requiredAmount: feeAmountB,
        })
        txb.transferObjects([
            feeCoinA.coinArg, 
            feeCoinB.coinArg
        ], feeToAddress)
        const {
            intergratePackageId,
            globalConfigObject,
        } = state.static.metadata as CetusLiquidityPoolMetadata
        txb.moveCall({
            target: `${intergratePackageId}::pool_script_v2::open_position_with_liquidity_by_fix_coin`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress,
            ],
            arguments: [
                txb.object(globalConfigObject),
                txb.object(state.static.poolAddress),
                txb.pure.u32(Number(asUintN(BigInt(tickLower.toNumber())).toString())),
                txb.pure.u32(Number(asUintN(BigInt(tickUpper.toNumber())).toString())),
                txb.object(sourceCoinA.coinArg),
                txb.object(sourceCoinB.coinArg),
                txb.pure.u64(remainingAmountA.toString()),
                txb.pure.u64(remainingAmountB.toString()),
                txb.pure.bool(true),
                txb.object(SUI_CLOCK_OBJECT_ID)
            ],
        })
        return {
            txb,
            feeAmountA,
            feeAmountB,
        }  
    }
}

export interface CreateOpenPositionTxbParams {
    txb: Transaction
    state: LiquidityPoolState
    tickLower: Decimal
    tickUpper: Decimal
    amountAMax: BN
    amountBMax: BN
    bot: BotSchema
    liquidity: BN
}

export interface CreateOpenPositionTxbResponse {
    txb: Transaction
    feeAmountA: BN
    feeAmountB: BN
}