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
    TurbosSuiObjectPositionFields,
    TurbosSuiObjectPositionNFTFields,
    TurbosSuiObjectTickFields,
    parseTurbosPosition,
    parseTurbosSuiObjectPositionNFT,
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
        try {
            const _state = state as ClmmLiquidityPoolState
            // Stage: state validation (fees require an active position)
            if (!bot.activePosition || !bot.activePosition.position) {
                throw new ActivePositionNotFoundException({
                    botId: bot.id,
                })
            }
            // Stage: state validation (pool token metadata must exist)
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
            const positionId = bot.activePosition.associatedPosition?.positionId ?? ""
            // Stage: state validation (CLMM state must be present on the associated position)
            if (!bot.activePosition.associatedPosition?.clmmState) {
                throw new LiquidityPoolClmmStateNotFoundException(
                    {
                        liquidityPoolId: _state.static.displayId,
                    }
                )
            }
            const tickLower = new BN(bot.activePosition.associatedPosition.clmmState.tickLower)
            const tickUpper = new BN(bot.activePosition.associatedPosition.clmmState.tickUpper)
            const { i32Type } = _state.static.metadata as TurbosLiquidityPoolMetadata
            const tickLowerName = serializeSuiI32(new BN(tickLower.toString()),
                i32Type)
            const tickUpperName = serializeSuiI32(new BN(tickUpper.toString()),
                i32Type)
            // Stage: on-chain fetch (tick lower dynamic field)
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
            // Stage: on-chain fetch (tick upper dynamic field)
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
            const nftPositionInfo = await this.rpcExecutorService.withSuiClient(
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
            if (nftPositionInfo.error || !nftPositionInfo.data) {
                throw new SuiObjectNotFoundException({
                    name: ErrorSuiObjectName.PositionNFT,
                    id: positionId,
                    dexId: DexId.Turbos,
                    liquidityPoolId: _state.static.displayId,
                })
            }
            if (nftPositionInfo.data.content?.dataType !== "moveObject") {
                throw new SuiObjectInvalidTypeException(
                    {
                        name: ErrorSuiObjectName.PositionNFT,
                        id: positionId,
                        liquidityPoolId: _state.static.displayId,
                        dexId: DexId.Turbos,
                    }
                )
            }
            const nftPositionFields = nftPositionInfo.data.content.fields as unknown as TurbosSuiObjectPositionNFTFields
            const nftPosition = parseTurbosSuiObjectPositionNFT(nftPositionFields)
            const positionInfo = await this.rpcExecutorService.withSuiClient(
                {
                    accessType: RpcAccessType.Http,
                    callback: async ({ suiClient }) => {
                        return suiClient.getObject({
                            id: nftPosition.positionId,
                            options: {
                                showContent: true,
                            }
                        })
                    },
                }
            )
            if (positionInfo.error || !positionInfo.data) {
                throw new SuiObjectNotFoundException({
                    name: ErrorSuiObjectName.Position,
                    id: nftPosition.positionId,
                    liquidityPoolId: _state.static.displayId,
                    dexId: DexId.Turbos,
                })
            }
            if (positionInfo.data.content?.dataType !== "moveObject") {
                throw new SuiObjectInvalidTypeException({
                    name: ErrorSuiObjectName.Position,
                    id: nftPosition.positionId,
                    liquidityPoolId: _state.static.displayId,
                    dexId: DexId.Turbos,
                })
            }
            const positionFields = positionInfo.data.content.fields as unknown as TurbosSuiObjectPositionFields
            const position = parseTurbosPosition(positionFields)
            const { feeA, feeB } = this.clmmFeesFormulaService.computeFees({
                feeGrowthGlobalA: _state.dynamic.feeGrowthGlobalA,
                feeGrowthGlobalB: _state.dynamic.feeGrowthGlobalB,
                feeGrowthOutsideLowerA: new BN(tickLowerData.feeGrowthOutsideA.toString()),
                feeGrowthOutsideUpperA: new BN(tickUpperData.feeGrowthOutsideA.toString()),
                feeGrowthOutsideLowerB: new BN(tickLowerData.feeGrowthOutsideB.toString()),
                feeGrowthOutsideUpperB: new BN(tickUpperData.feeGrowthOutsideB.toString()),
                tickCurrent: _state.dynamic.tickCurrent,
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
                decimalsA: new Decimal(tokenA.decimals),
                decimalsB: new Decimal(tokenB.decimals),
            })
            console.log({
                feeA: feeA.toString(),
                feeB: feeB.toString(),
            })

            return {
                snapshotAt: _state.dynamic.snapshotAt,
                feeA,
                feeB,
                rewards: [],
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}