import {
    asUintN 
} from "@cetusprotocol/cetus-sui-clmm-sdk"
import {
    CetusLiquidityPoolMetadata, PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    Transaction 
} from "@mysten/sui/transactions"
import {
    Injectable 
} from "@nestjs/common"
import {
    InvalidPoolTokensException, 
    LiquidityPoolClmmStateNotFoundException
} from "@modules/exceptions"
import {
    TargetOperationalGasAmountNotFoundException 
} from "@modules/exceptions"
import {
    FeeService 
} from "../../../math"
import {
    SelectCoinsService 
} from "../../../tx-builder"
import BN from "bn.js"
import {
    adjustSlippage,
    ChainId 
} from "@modules/common"
import {
    CreateOpenPositionTxbParams,
    CreateOpenPositionTxbResult
} from "../types"
import {
    SUI_CLOCK_OBJECT_ID 
} from "@mysten/sui/utils"
import {
    MountStorageService 
} from "@modules/filesystem"
import {
    ClmmLiquidityFormulaService 
} from "../../../formulas"
import {
    envConfig 
} from "@modules/env"
import Decimal from "decimal.js"

@Injectable()
export class OpenPositionTxbService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly feeService: FeeService,
        private readonly selectCoinsService: SelectCoinsService,
        private readonly mountStorageService: MountStorageService,
        private readonly clmmLiquidityFormulaService: ClmmLiquidityFormulaService,
    ) { }

    async createOpenPositionTxb(
        {
            txb,
            liquidityPool,
            tickLower,
            tickUpper,
            amountAMax,
            amountBMax,
            bot,
            state
        }: CreateOpenPositionTxbParams
    ): Promise<CreateOpenPositionTxbResult> {
        txb = txb ?? new Transaction()
        txb.setSender(bot.accountAddress)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                id: {
                    $eq: liquidityPool.tokenA.toString(),
                },
            }

        )
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne(
            {
                id: {
                    $eq: liquidityPool.tokenB.toString(),
                },
            }
        )
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException(
                {
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
        }
        const feeToAddress = this.mountStorageService.appConfig.fees.openPosition.sui.feeToAddress
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
        if (!liquidityPool.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException(
                {
                    liquidityPoolId: liquidityPool.displayId,
                }
            )
        }
        const liquidity = this.clmmLiquidityFormulaService.computeLiquidity({
            amountA: new BN(amountAMax),
            amountB: new BN(amountBMax),
            tickLower: new BN(tickLower),
            tickUpper: new BN(tickUpper),
            tickCurrent: new BN(state.tickCurrent),
        })
        // we check balances of tokenA and tokenB
        const targetOperationalAmount = this.primaryMemoryStorageService.
            gasConfig.
            gasAmountRequired[ChainId.Sui]?.
            targetOperationalAmount
        if (!targetOperationalAmount) {
            throw new TargetOperationalGasAmountNotFoundException(
                {
                    chainId: bot.chainId,
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
        const {
            spendCoin: feeCoinA
        } = this.selectCoinsService.splitCoin(
            {
                txb,
                sourceCoin: sourceCoinA,
                requiredAmount: feeAmountA,
            }
        )
        const {
            spendCoin: feeCoinB
        } = this.selectCoinsService.splitCoin(
            {
                txb,
                sourceCoin: sourceCoinB,
                requiredAmount: feeAmountB,
            }
        )
        txb.transferObjects(
            [
                feeCoinA.coinArg,
                feeCoinB.coinArg
            ],
            feeToAddress)
        const {
            intergratePackageId,
            globalConfigObject,
        } = liquidityPool.metadata as CetusLiquidityPoolMetadata
        txb.moveCall({
            target: `${intergratePackageId}::pool_script_v2::open_position_with_liquidity`,
            typeArguments: [
                tokenA.tokenAddress,
                tokenB.tokenAddress,
            ],
            arguments: [
                txb.object(globalConfigObject),
                txb.object(liquidityPool.poolAddress),
                txb.pure.u32(Number(asUintN(BigInt(tickLower.toNumber())).toString())),
                txb.pure.u32(Number(asUintN(BigInt(tickUpper.toNumber())).toString())),
                txb.object(sourceCoinA.coinArg),
                txb.object(sourceCoinB.coinArg),
                txb.pure.u64(remainingAmountA.toString()),
                txb.pure.u64(remainingAmountB.toString()),
                txb.pure.u128(adjustSlippage({
                    bn: liquidity,
                    slippage: new Decimal(envConfig().dexes.cetus.openPosition.slippage),
                    isRoundUp: false,
                }).toString()),
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