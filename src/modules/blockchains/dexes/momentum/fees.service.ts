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
    LiquidityPoolClmmStateNotFoundException,
} from "@modules/exceptions"
import BN from "bn.js"
import {
    ClmmLiquidityPoolState 
} from "../../interfaces"
import {
    Q128, Q64 
} from "@modules/utils"
import {
    RpcAccessType 
} from "@modules/filesystem"
import Decimal from "decimal.js"
import {
    MomentumSuiObjectPositionFields,
    MomentumSuiObjectTickInfoFields,
    parseMomentumPosition,
    parseMomentumTickInfo
} from "./struct"
import {
    serializeSuiI32, SuiMoveObjectData, SuiObject 
} from "../../structs"
import {
    ClmmFeesFormulaService
} from "../../formulas"
import {
    DexId,
    MomentumLiquidityPoolMetadata,
    PrimaryMemoryStorageService
} from "@modules/databases"

@Injectable()
export class MomentumFeesService implements IFeesService {
    constructor(
        private readonly rpcExecutorService: RpcExecutorService,
        private readonly clmmFeesFormulaService: ClmmFeesFormulaService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) { }

    async fees({ state, bot }: FeesParams): Promise<FeesResult> {
        const _state = state as ClmmLiquidityPoolState
        // Stage: state validation (fees require an active position)
        if (!bot.activePosition || !bot.activePosition.associatedPosition) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        // Stage: state validation (position must have CLMM state recorded)
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        // Stage: state validation (pool token metadata must exist)
        const tokenA = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: _state.static.tokenA.toString(),
            },
        })
        const tokenB = this.primaryMemoryStorageService.tokenCollection.findOne({
            id: {
                $eq: _state.static.tokenB.toString(),
            },
        })
        if (!tokenA || !tokenB) {
            throw new InvalidPoolTokensException({
                liquidityPoolId: _state.static.displayId,
            })
        }
        const positionId = bot.activePosition.associatedPosition.positionId
        const tickLower = new BN(bot.activePosition.associatedPosition.clmmState.tickLower)
        const tickUpper = new BN(bot.activePosition.associatedPosition.clmmState.tickUpper)
        const { i32Type } = _state.static.metadata as MomentumLiquidityPoolMetadata
        const tickLowerName = serializeSuiI32(new BN(tickLower.toString()),
            i32Type)
        const tickUpperName = serializeSuiI32(new BN(tickUpper.toString()),
            i32Type)
        const { ticksId } = _state.static.metadata as MomentumLiquidityPoolMetadata
        // Stage: on-chain fetch (tick lower dynamic field)
        const { data: tickLowerDataRaw } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: ticksId,
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
                    parentId: ticksId,
                    dexId: DexId.Momentum,
                    liquidityPoolId: _state.static.displayId,
                }
            )
        }
        const _tickLowerData = tickLowerDataRaw as unknown as SuiMoveObjectData<
            SuiObject<MomentumSuiObjectTickInfoFields, `${string}::tick::TickInfo`>,
            `${string}::tick::TickInfo`
        >
        const tickLowerData = parseMomentumTickInfo(_tickLowerData.content.fields.value.fields)
        // get the tick upper data
        const { data: tickUpperDataRaw } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: ticksId,
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
                parentId: ticksId,
                dexId: DexId.Momentum,
                liquidityPoolId: _state.static.displayId,
            })
        }
        const _tickUpperData = tickUpperDataRaw as unknown as SuiMoveObjectData<
            SuiObject<MomentumSuiObjectTickInfoFields, `${string}::tick::TickInfo`>,
            `${string}::tick::TickInfo`
        >
        const tickUpperData = parseMomentumTickInfo(_tickUpperData.content.fields.value.fields)
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
                dexId: DexId.Momentum,
                liquidityPoolId: _state.static.displayId,
            })
        }
        if (objectInfo.data.content?.dataType !== "moveObject") {
            throw new SuiObjectInvalidTypeException(
                {
                    name: ErrorSuiObjectName.Position,
                    id: positionId,
                    liquidityPoolId: _state.static.displayId,
                    dexId: DexId.Momentum,
                }
            )
        }
        const fields = objectInfo.data.content.fields as unknown as MomentumSuiObjectPositionFields
        const position = parseMomentumPosition(fields)
        const { feeA, feeB } = this.clmmFeesFormulaService.computeFees({
            feeGrowthGlobalA: _state.dynamic.feeGrowthGlobalA,
            feeGrowthGlobalB: _state.dynamic.feeGrowthGlobalB,
            feeGrowthOutsideLowerA: new BN(tickLowerData.feeGrowthOutsideX.toString()),
            feeGrowthOutsideUpperA: new BN(tickUpperData.feeGrowthOutsideX.toString()),
            feeGrowthOutsideLowerB: new BN(tickLowerData.feeGrowthOutsideY.toString()),
            feeGrowthOutsideUpperB: new BN(tickUpperData.feeGrowthOutsideY.toString()),
            tickCurrent: _state.dynamic.tickCurrent,
            tickLower,
            tickUpper,
            feeGrowthInsideLastA: position.feeGrowthInsideXLast,
            feeGrowthInsideLastB: position.feeGrowthInsideYLast,
            liquidity: position.liquidity,
            feeOwnedA: position.owedCoinX,
            feeOwnedB: position.owedCoinY,
            outsideDeltaWrapModulus: Q128,
            insideDeltaWrapModulus: Q128,
            resultDiv: Q64,
            decimalsA: new Decimal(tokenA.decimals),
            decimalsB: new Decimal(tokenB.decimals),
        })

        return {
            snapshotAt: _state.dynamic.snapshotAt,
            feeA,
            feeB,
            rewards: [],
        }
    }
}