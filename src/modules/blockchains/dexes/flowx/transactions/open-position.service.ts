import { 
    FeeToAddressNotFoundException, 
    InvalidPoolTokensException, 
    TargetOperationalGasAmountNotFoundException
} from "@exceptions"
import { LiquidityPoolState } from "../../../interfaces"
import { 
    BotSchema, 
    FlowXLiquidityPoolMetadata, 
    LoadBalancerName, 
    PrimaryMemoryStorageService
} from "@modules/databases"
import { Transaction } from "@mysten/sui/transactions"
import {
    SUI_CLOCK_OBJECT_ID,
} from "@mysten/sui/utils"
import { Injectable } from "@nestjs/common"
import { adjustSlippage, decimalToBips } from "@utils"
import Decimal from "decimal.js"
import BN from "bn.js"
import { DayjsService } from "@modules/mixin"
import { SelectCoinsService } from "../../../tx-builder"
import { ChainId } from "@typedefs"
import { OPEN_POSITION_SLIPPAGE } from "../../constants"
import { FeeService } from "../../../math"

@Injectable()
export class OpenPositionTxbService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly selectCoinsService: SelectCoinsService,
        private readonly dayjsService: DayjsService,
        private readonly feeService: FeeService,
    ) {}

    async createOpenPositionTxb(
        {
            txb,
            bot,
            state,
            tickLower,
            tickUpper,
            amountAMax,
            amountBMax,
        }: CreateOpenPositionTxbParams
    ): Promise<CreateOpenPositionTxbResponse> {
        txb = txb ?? new Transaction()
        const {
            packageId,
            positionRegistryObject,
            poolRegistryObject,
            versionObject
        } = state.static.metadata as FlowXLiquidityPoolMetadata
        const tokenA = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenA.toString()
        )
        const tokenB = this.primaryMemoryStorageService.tokens.find(
            (token) => token.id === state.static.tokenB.toString()
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException("Either token A or token B is not in the pool")
        }
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
        const { 
            sourceCoin: sourceCoinA 
        } = await this.selectCoinsService.fetchAndMergeCoins(
            {
                loadBalancerName: LoadBalancerName.FlowXClmm,
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
                loadBalancerName: LoadBalancerName.FlowXClmm,
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
        const [
            tickLowerI32, 
            tickUpperI32
        ] = [
            txb.moveCall({
                target: `${packageId}::i32::${
                    tickLower.gte(0) ? "from" : "neg_from"
                }`,
                arguments: [txb.pure.u32(tickLower.abs().toNumber())],
            }),
            txb.moveCall({
                target: `${packageId}::i32::${
                    tickUpper.gte(0) ? "from" : "neg_from"
                }`,
                arguments: [txb.pure.u32(tickUpper.abs().toNumber())],
            }),
        ]
        const position = txb.moveCall({
            target: `${
                packageId
            }::position_manager::open_position`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress,
            ],
            arguments: [
                txb.object(positionRegistryObject),
                txb.object(poolRegistryObject),
                txb.pure.u64(decimalToBips(state.static.fee)),
                tickLowerI32,
                tickUpperI32,
                txb.object(versionObject),
            ]
        })
        txb.moveCall({
            target: `${packageId}::position_manager::increase_liquidity`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress,
            ],
            arguments: [
                txb.object(poolRegistryObject),
                position,
                sourceCoinA.coinArg,
                sourceCoinB.coinArg,
                txb.pure.u64(adjustSlippage(remainingAmountA, OPEN_POSITION_SLIPPAGE).toString()),
                txb.pure.u64(adjustSlippage(remainingAmountB, OPEN_POSITION_SLIPPAGE).toString()),
                txb.pure.u64(this.dayjsService.now().add(5, "minute").utc().valueOf().toString()),
                txb.object(versionObject),
                txb.object(SUI_CLOCK_OBJECT_ID),
            ],
        })
        txb.transferObjects([position], txb.pure.address(bot.accountAddress))
        return {
            txb,
            feeAmountA,
            feeAmountB,
        }
    }
}

export interface CreateOpenPositionTxbParams { 
    txb: Transaction 
    bot: BotSchema,
    state: LiquidityPoolState,
    tickLower: Decimal,
    tickUpper: Decimal,
    liquidity: BN,
    amountAMax: BN,
    amountBMax: BN,
}

export interface CreateOpenPositionTxbResponse {
    txb: Transaction
    feeAmountA: BN
    feeAmountB: BN
}