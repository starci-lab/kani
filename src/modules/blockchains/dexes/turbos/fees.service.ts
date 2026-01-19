import {
    FeesParams, FeesResult, IFeesService 
} from "../../interfaces"
import {
    Injectable 
} from "@nestjs/common"
import {
    RpcExecutorService 
} from "../../clients"
import {
    ActivePositionNotFoundException,
    InvalidPoolTokensException,
    SuiObjectNotFoundException,
    ErrorSuiObjectName,
    SuiObjectInvalidTypeException,
} from "@modules/exceptions"
import BN from "bn.js"
import {
    ClmmLiquidityPoolState 
} from "../../interfaces"
import {
    computeDenomination, Q128, Q64 
} from "@modules/utils"
import {
    RpcAccessType 
} from "@modules/filesystem"
import Decimal from "decimal.js"
import {
    TurbosSuiObjectPositionFields,
    TurbosSuiObjectTickFields,
    parseTurbosPosition,
    parseTurbosTick
} from "./struct"
import {
    serializeSuiI32, SuiMoveObjectData, SuiObject 
} from "../../structs"
import {
    ClmmFeesFormulaService
} from "../../formulas"
import {
    DexId,
    TurbosLiquidityPoolMetadata,
    PrimaryMemoryStorageService
} from "@modules/databases"

@Injectable()
export class TurbosFeesService implements IFeesService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly clmmFeesFormulaService: ClmmFeesFormulaService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }

    async fees({ state, bot }: FeesParams): Promise<FeesResult> {
        const _state = state as ClmmLiquidityPoolState
        if (!bot.activePositionLiquidityPool ||
            !bot.activePosition ||
            !bot.activePositionLiquidityPoolType
        ) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenA.toString(),
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: _state.static.tokenB.toString(),
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        const positionId = bot.activePosition.positionId
        const tickLower = new Decimal(bot.activePosition.tickLower ?? 0)
        const tickUpper = new Decimal(bot.activePosition.tickUpper ?? 0)
        const { i32Type } = _state.static.metadata as TurbosLiquidityPoolMetadata
        const tickLowerName = serializeSuiI32(new BN(tickLower.toString()),
            i32Type)
        const tickUpperName = serializeSuiI32(new BN(tickUpper.toString()),
            i32Type)
        // get the tick lower data
        const { data: tickLowerDataRaw } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: _state.static.poolAddress,
                    name: {
                        type: tickLowerName.type,
                        value: tickLowerName.fields
                    },
                })
            },
        })
        if (!tickLowerDataRaw) {
            throw new SuiObjectNotFoundException(
                {
                    name: ErrorSuiObjectName.TickLower,
                    parentId: _state.static.poolAddress,
                    dexId: DexId.Turbos,
                    liquidityPoolId: _state.static.displayId,
                }
            )
        }
        const _tickLowerData = tickLowerDataRaw as unknown as SuiMoveObjectData<
            SuiObject<TurbosSuiObjectTickFields, `${string}::tick::TickInfo`>,
            `${string}::tick::TickInfo`
        >
        const tickLowerData = parseTurbosTick(_tickLowerData.content.fields.value.fields)
        // get the tick upper data
        const { data: tickUpperDataRaw } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: _state.static.poolAddress,
                    name: {
                        type: tickUpperName.type,
                        value: tickUpperName.fields
                    },
                })
            },
        })
        if (!tickUpperDataRaw) {
            throw new SuiObjectNotFoundException({
                name: ErrorSuiObjectName.TickUpper,
                parentId: _state.static.poolAddress,
                dexId: DexId.Turbos,
                liquidityPoolId: _state.static.displayId,
            })
        }
        const _tickUpperData = tickUpperDataRaw as unknown as SuiMoveObjectData<
            SuiObject<TurbosSuiObjectTickFields, `${string}::tick::TickInfo`>,
            `${string}::tick::TickInfo`
        >
        const tickUpperData = parseTurbosTick(_tickUpperData.content.fields.value.fields)
        // ----------------------------
        // Position checkpoint
        // ----------------------------
        // ----------------------------
        // Fee calculation (WRAPPED)
        // ----------------------------
        const objectInfo = await this.rpcExecutorService.withSuiClient(
            {
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return suiClient.getObject({
                        id: positionId,
                        options: {
                            showContent: true,
                        }
                    })
                },
            }
        )
        if (objectInfo.error || !objectInfo.data) {
            throw new SuiObjectNotFoundException({
                name: ErrorSuiObjectName.Position,
                id: positionId,
                dexId: DexId.Turbos,
                liquidityPoolId: _state.static.displayId,
            })
        }
        if (objectInfo.data.content?.dataType !== "moveObject") {
            throw new SuiObjectInvalidTypeException(
                {
                    name: ErrorSuiObjectName.Position,
                    id: positionId,
                    liquidityPoolId: _state.static.displayId,
                    dexId: DexId.Turbos,
                }
            )
        }
        const fields = objectInfo.data.content.fields as unknown as TurbosSuiObjectPositionFields
        const position = parseTurbosPosition(fields)
        const { feeA, feeB } = this.clmmFeesFormulaService.computeFees({
            feeGrowthGlobal: _state.dynamic.feeGrowthGlobalA,
            feeGrowthOutsideLower: new BN(tickLowerData.feeGrowthOutsideA.toString()),
            feeGrowthOutsideUpper: new BN(tickUpperData.feeGrowthOutsideB.toString()),
            tickCurrent: new Decimal(new BN(_state.dynamic.tickCurrent).toString()),
            tickLower,
            tickUpper,
            feeGrowthInsideLastA: position.feeGrowthInsideA,
            feeGrowthInsideLastB: position.feeGrowthInsideB,
            liquidity: position.liquidity,
            feeOwnedA: position.tokensOwedA,
            feeOwnedB: position.tokensOwedB,
            outsideDeltaWrapModulus: Q128,
            insideDeltaWrapModulus: Q128,
            resultDiv: Q64,
        })

        return {
            snapshotAt: _state.dynamic.snapshotAt,
            feeA: computeDenomination(
                feeA,
                tokenA.decimals,
                tokenB.decimals
            ),
            feeB: computeDenomination(
                feeB,
                tokenB.decimals,
                tokenA.decimals
            ),
            rewards: [],
        }
    }
}