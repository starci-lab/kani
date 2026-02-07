import { 
    FeeToAddressNotFoundException, 
    InvalidPoolTokensException, 
    TargetOperationalGasAmountNotFoundException
} from "@modules/exceptions"
import { 
    FlowXLiquidityPoolMetadata, 
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    Transaction 
} from "@mysten/sui/transactions"
import {
    SUI_CLOCK_OBJECT_ID,
} from "@mysten/sui/utils"
import {
    Injectable 
} from "@nestjs/common"
import {
    adjustSlippage, decimalToBps 
} from "@modules/common"
import Decimal from "decimal.js"
import BN from "bn.js"
import {
    DayjsService 
} from "@modules/mixin"
import {
    SelectCoinsService 
} from "../../../tx-builder"
import {
    ChainId 
} from "@modules/common"
import {
    FeeService 
} from "../../../math"
import {
    MountStorageService 
} from "@modules/filesystem"
import {
    envConfig 
} from "@modules/env"
import {
    CreateOpenPositionTxbParams,
    CreateOpenPositionTxbResult
} from "../types"

/**
 * Service responsible for creating open position transaction builders for FlowX.
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
        private readonly selectCoinsService: SelectCoinsService,
        private readonly dayjsService: DayjsService,
        private readonly feeService: FeeService,
        private readonly mountStorageService: MountStorageService,
    ) {}

    async createOpenPositionTxb(
        {
            txb,
            bot,
            tickLower,
            tickUpper,
            amountA,
            amountB,
            liquidityPool,
        }: CreateOpenPositionTxbParams
    ): Promise<CreateOpenPositionTxbResult> {
        txb = txb ?? new Transaction()
        txb.setSender(bot.accountAddress)
        const {
            packageId,
            positionRegistryObject,
            poolRegistryObject,
            versionObject
        } = liquidityPool.metadata as FlowXLiquidityPoolMetadata
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: liquidityPool.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: liquidityPool.tokenB.toString(),
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: liquidityPool.displayId,
            })
        }
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
            amount: amountA,
            chainId: bot.chainId,
        })
        const {
            feeAmount: feeAmountB,
            remainingAmount: remainingAmountB,
        } = this.feeService.splitAmount({
            amount: amountB,
            chainId: bot.chainId,
        })
        const slippage = new Decimal(envConfig().dexes.flowx.openPosition.slippage)
        // we check balances of tokenA and tokenB
        const { 
            sourceCoin: sourceCoinA 
        } = await this.selectCoinsService.fetchAndMergeCoins(
            {
                txb,
                owner: bot.accountAddress,
                coinType: tokenA.tokenAddress,
                requiredAmount: amountA,
                suiGasAmount: new BN(targetOperationalAmount),
            })
        const { 
            sourceCoin: sourceCoinB 
        } = await this.selectCoinsService.fetchAndMergeCoins(
            {
                txb,
                owner: bot.accountAddress,
                coinType: tokenB.tokenAddress,
                requiredAmount: amountB,
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
        ],
        feeToAddress)
        const [
            tickLowerI32, 
            tickUpperI32
        ] = [
            txb.moveCall({
                target: `${packageId}::i32::${
                    tickLower.gte(new BN(0)) ? "from" : "neg_from"
                }`,
                arguments: [txb.pure.u32(tickLower.abs().toNumber())],
            }),
            txb.moveCall({
                target: `${packageId}::i32::${
                    tickUpper.gte(new BN(0)) ? "from" : "neg_from"
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
                txb.pure.u64(decimalToBps(new Decimal(liquidityPool.fee).mul(100)).toNumber()),
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
                txb.pure.u64(
                    adjustSlippage({
                        bn: remainingAmountA,
                        slippage,
                        isRoundUp: false,
                    }).toString()),
                txb.pure.u64(
                    adjustSlippage({
                        bn: remainingAmountB,
                        slippage,
                        isRoundUp: false,
                    }).toString()),
                txb.pure.u64(this.dayjsService.now().add(5,
                    "minute").utc().valueOf().toString()),
                txb.object(versionObject),
                txb.object(SUI_CLOCK_OBJECT_ID),
            ],
        })
        txb.transferObjects([position],
            txb.pure.address(bot.accountAddress))
        return {
            txb,
            feeAmountA,
            feeAmountB,
        }
    }
}
