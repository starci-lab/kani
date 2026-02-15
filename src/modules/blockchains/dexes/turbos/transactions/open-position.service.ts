import { 
    PrimaryMemoryStorageService, 
    TurbosLiquidityPoolMetadata 
} from "@modules/databases"
import {
    Transaction 
} from "@mysten/sui/transactions"
import {
    Injectable 
} from "@nestjs/common"
import {
    BN 
} from "turbos-clmm-sdk"
import {
    FeeService 
} from "../../../math"
import {
    SelectCoinsService 
} from "../../../tx-builder"
import {
    DayjsService 
} from "@modules/mixin"
import { 
    FeeToAddressNotFoundException, 
    InvalidPoolTokensException, 
    TargetOperationalGasAmountNotFoundException 
} from "@modules/exceptions"
import {
    ChainId 
} from "@modules/common"
import {
    SUI_CLOCK_OBJECT_ID 
} from "@mysten/sui/utils"
import {
    MountStorageService 
} from "@modules/filesystem"
import {
    adjustSlippage 
} from "@modules/common"
import Decimal from "decimal.js"
import {
    envConfig 
} from "@modules/env"
import {
    CreateOpenPositionTxbParams,
    CreateOpenPositionTxbResult
} from "../types"

/**
 * Service responsible for creating open position transaction builders for Turbos.
 * Handles transaction construction for opening liquidity positions.
 *
 * @example
 * const service = new OpenPositionTxbService(...)
 * const result = await service.createOpenPositionTxb({ bot, state, tickLower, tickUpper, amountA, amountB })
 */
@Injectable()
export class OpenPositionTxbService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly feeService: FeeService,
        private readonly selectCoinsService: SelectCoinsService,
        private readonly dayjsService: DayjsService,
        private readonly mountStorageService: MountStorageService,
    ) {}

    async createOpenPositionTxb(
        {
            txb,
            liquidityPool,
            tickLower,
            tickUpper,
            amountAMax,
            amountBMax,
            bot,     
        }: CreateOpenPositionTxbParams
    ): Promise<CreateOpenPositionTxbResult> {
        txb = txb ?? new Transaction()
        txb.setSender(bot.accountAddress)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: liquidityPool.tokenA.toString()
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: liquidityPool.tokenB.toString()
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
        const feeToAddress = this.mountStorageService.appConfig.fees.openPosition.sui.feeToAddress
        if (!feeToAddress) {
            throw new FeeToAddressNotFoundException({
                feeToAddress,
            })
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
                {
                    chainId: ChainId.Sui,
                }
            )
        }
        const { 
            sourceCoin: sourceCoinA 
        } = await this.selectCoinsService.fetchAndMergeCoins(
            {
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
        } = liquidityPool.metadata as TurbosLiquidityPoolMetadata
        const coinAVec = txb.makeMoveVec(
            {
                elements: [
                    txb.object(sourceCoinA.coinArg),
                ]
            }
        )
        const coinBVec = txb.makeMoveVec({
            elements: [
                txb.object(sourceCoinB.coinArg),
            ]
        })
        const slippage = new Decimal(envConfig().dexes.turbos.openPosition.slippage)
        const deadline = this.dayjsService.now().add(100,
            "year").utc().valueOf().toString()
        txb.moveCall({
            target: `${packageId}::position_manager::mint`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress,
                feeType
            ],
            arguments: [
                // pool address
                txb.object(liquidityPool.poolAddress),
                // positions object
                txb.object(positionsObject),
                // coin A vec
                coinAVec,
                // coin B vec
                coinBVec,
                // tick lower index
                txb.pure.u32(Number(tickLower.abs().toNumber())),
                // tick lower is negative
                txb.pure.bool(tickLower.lt(new BN(0))),
                // tick upper index
                txb.pure.u32(Number(tickUpper.abs().toNumber())),
                // tick upper is negative
                txb.pure.bool(tickUpper.lt(new BN(0))),
                // remaining amount A
                txb.pure.u64(remainingAmountA.toString()),
                // remaining amount B
                txb.pure.u64(remainingAmountB.toString()),
                // minimum amount A
                txb.pure.u64(
                    adjustSlippage({
                        bn: remainingAmountA,
                        slippage,
                        isRoundUp: false,
                    }).toString()
                ),
                // minimum amount B
                txb.pure.u64(
                    adjustSlippage({
                        bn: remainingAmountB,
                        slippage,
                        isRoundUp: false,
                    }).toString()
                ),
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