import { LiquidityPoolState } from "../../../interfaces"
import { 
    BotSchema, 
    LoadBalancerName, 
    PrimaryMemoryStorageService, 
    TurbosLiquidityPoolMetadata 
} from "@modules/databases"
import { Transaction } from "@mysten/sui/transactions"
import { Injectable } from "@nestjs/common"
import { Decimal } from "decimal.js"
import { BN } from "turbos-clmm-sdk"
import { FeeService } from "../../../math"
import { SelectCoinsService } from "../../../tx-builder"
import { DayjsService } from "@modules/mixin"
import { 
    FeeToAddressNotFoundException, 
    InvalidPoolTokensException, 
    TargetOperationalGasAmountNotFoundException 
} from "@exceptions"
import { ChainId } from "@typedefs"
import { OPEN_POSITION_SLIPPAGE } from "../../constants"
import { adjustSlippage } from "@utils"
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"

@Injectable()
export class OpenPositionTxbService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly feeService: FeeService,
        private readonly selectCoinsService: SelectCoinsService,
        private readonly dayjsService: DayjsService,
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
                loadBalancerName: LoadBalancerName.TurbosClmm,
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
                loadBalancerName: LoadBalancerName.TurbosClmm,
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
        txb.transferObjects(
            [
                feeCoinA.coinArg, 
                feeCoinB.coinArg
            ], 
            txb.pure.address(feeToAddress)
        )

        const {
            packageId,
            feeType,
            positionsObject,
            versionObject 
        } = state.static.metadata as TurbosLiquidityPoolMetadata
        const coinAVec = txb.makeMoveVec({
            elements: [
                txb.object(sourceCoinA.coinArg),
            ]
        })
        const coinBVec = txb.makeMoveVec({
            elements: [
                txb.object(sourceCoinB.coinArg),
            ]
        })
        const deadline = this.dayjsService.now().add(5, "minute").utc().valueOf().toString()
        txb.moveCall({
            target: `${packageId}::position_manager::mint`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress,
                feeType
            ],
            arguments: [
                // pool address
                txb.object(state.static.poolAddress),
                // positions object
                txb.object(positionsObject),
                // coin A vec
                coinAVec,
                // coin B vec
                coinBVec,
                // tick lower index
                txb.pure.u32(Number(tickLower.abs().toNumber())),
                // tick lower is negative
                txb.pure.bool(tickLower.lt(0)),
                // tick upper index
                txb.pure.u32(Number(tickUpper.abs().toNumber())),
                // tick upper is negative
                txb.pure.bool(tickUpper.lt(0)),
                // remaining amount A
                txb.pure.u64(remainingAmountA.toString()),
                // remaining amount B
                txb.pure.u64(remainingAmountB.toString()),
                // minimum amount A
                txb.pure.u64(
                    adjustSlippage(
                        remainingAmountA, 
                        OPEN_POSITION_SLIPPAGE
                    ).toString()),
                // minimum amount B
                txb.pure.u64(
                    adjustSlippage(
                        remainingAmountB, 
                        OPEN_POSITION_SLIPPAGE
                    ).toString()),
                // bot account address
                txb.pure.address(bot.accountAddress),
                // deadline
                txb.pure.u64(deadline),
                // SUI clock object ID
                txb.object(SUI_CLOCK_OBJECT_ID),
                // version object
                txb.object(versionObject),
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