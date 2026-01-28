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
    InvalidTickScoreException,
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
    CetusSuiObjectPositionInfoFields, 
    CetusSuiObjectTickFields, 
    CetusSuiSkipListNodeFields, 
    parseCetusPositionInfo, 
    parseCetusTick
} from "./struct"
import {
    SuiMoveObjectData 
} from "../../structs"
import { 
    ClmmFeesFormulaService
} from "../../formulas"
import { 
    CetusLiquidityPoolMetadata, 
    DexId, 
    PrimaryMemoryStorageService 
} from "@modules/databases"

@Injectable()
export class CetusFeesService implements IFeesService {
    constructor(
    private readonly rpcExecutorService: RpcExecutorService,
    private readonly clmmFeesFormulaService: ClmmFeesFormulaService,
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}

    async fees({ state, bot }: FeesParams): Promise<FeesResult> {
        const _state = state as ClmmLiquidityPoolState
        // Stage: state validation (fees require an active position)
        if (!bot.activePosition || !bot.activePosition.associatedPosition
        ) {
            throw new ActivePositionNotFoundException({
                botId: bot.id,
            })
        }
        // Stage: state validation (position must have CLMM state recorded)
        if (!bot.activePosition.associatedPosition.clmmState) {
            throw new LiquidityPoolClmmStateNotFoundException(
                {
                    liquidityPoolId: _state.static.displayId,
                }
            )
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
        const lowerScore = this.tickScore(tickLower)
        const upperScore = this.tickScore(tickUpper)
        const { tickManagerId, positionManagerId } = _state.static.metadata as CetusLiquidityPoolMetadata
        // Stage: on-chain fetch (tick lower dynamic field)
        const { data: tickLowerDataRaw } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: tickManagerId,
                    name: {
                        type: "u64",
                        value: lowerScore.toString(),
                    },
                })
            },
        })
        if (!tickLowerDataRaw) {
            throw new SuiObjectNotFoundException(
                {
                    name: ErrorSuiObjectName.TickLower,
                    parentId: tickManagerId,
                    dexId: DexId.Cetus,
                    liquidityPoolId: _state.static.displayId,
                }
            )
        }
        const _tickLowerData = tickLowerDataRaw as unknown as SuiMoveObjectData<
        CetusSuiSkipListNodeFields<CetusSuiObjectTickFields
        , `${string}::tick::Tick`
        >>
        const tickLowerData = parseCetusTick(_tickLowerData.content.fields.value.fields.value.fields)
        // get the tick upper data
        const { data: tickUpperDataRaw } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: tickManagerId,
                    name: {
                        type: "u64",
                        value: upperScore.toString(),
                    },
                })
            },
        })
        if (!tickUpperDataRaw) {
            throw new SuiObjectNotFoundException(
                {
                    name: ErrorSuiObjectName.TickUpper,
                    parentId: tickManagerId,
                    dexId: DexId.Cetus,
                    liquidityPoolId: _state.static.displayId,
                }
            )
        }
        const _tickUpperData = tickUpperDataRaw as unknown as SuiMoveObjectData<
        CetusSuiSkipListNodeFields<
        CetusSuiObjectTickFields, 
        `${string}::tick::Tick`
        >>
        const tickUpperData = parseCetusTick(_tickUpperData.content.fields.value.fields.value.fields)
        // ----------------------------
        // Position checkpoint
        // ----------------------------
        // ----------------------------
        // Fee calculation (WRAPPED)
        // ----------------------------
        const { data: positionInfoDataRaw } = await this.rpcExecutorService.withSuiClient(
            {
                accessType: RpcAccessType.Http,
                callback: async ({ suiClient }) => {
                    return suiClient.getDynamicFieldObject({
                        parentId: positionManagerId,
                        name: {
                            type: "0x2::object::ID",
                            value: positionId,
                        },
                    })
                },
            }
        )
        if (!positionInfoDataRaw) {
            throw new SuiObjectNotFoundException(
                {
                    name: ErrorSuiObjectName.PositionInfo,
                    parentId: positionManagerId,
                    dexId: DexId.Cetus,
                    liquidityPoolId: _state.static.displayId,
                }
            )
        }
        const _positionInfoData = positionInfoDataRaw as unknown as SuiMoveObjectData<
        CetusSuiSkipListNodeFields<
        CetusSuiObjectPositionInfoFields, 
        `${string}::position::PositionInfo`
        >>
        const positionInfoData = parseCetusPositionInfo(
            _positionInfoData.content.fields.value.fields.value.fields
        )
        const { feeA, feeB } = this.clmmFeesFormulaService.computeFees({
            feeGrowthGlobalA: _state.dynamic.feeGrowthGlobalA,
            feeGrowthGlobalB: _state.dynamic.feeGrowthGlobalB,
            feeGrowthOutsideLowerA: new BN(tickLowerData.feeGrowthOutsideA.toString()),
            feeGrowthOutsideUpperA: new BN(tickUpperData.feeGrowthOutsideA.toString()),
            feeGrowthOutsideLowerB: new BN(tickLowerData.feeGrowthOutsideB.toString()),
            feeGrowthOutsideUpperB: new BN(tickUpperData.feeGrowthOutsideB.toString()),
            tickCurrent: _state.dynamic.tickCurrent,
            tickLower: new BN(tickLower.toNumber()),
            tickUpper: new BN(tickUpper.toNumber()),
            feeGrowthInsideLastA: positionInfoData.feeGrowthInsideA,
            feeGrowthInsideLastB: positionInfoData.feeGrowthInsideB,
            liquidity: positionInfoData.liquidity,
            feeOwnedA: positionInfoData.feeOwnedA,
            feeOwnedB: positionInfoData.feeOwnedB,
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

    private tickScore(tick: BN): BN {
        const tickScore = tick.add(this.tickBound())
        if (tickScore.lt(new BN(0)) || tickScore.gt(this.tickBound().mul(new BN(2)))) {
            throw new InvalidTickScoreException({
                tickScore: tickScore.toNumber(),
            })
        }
        return tickScore
    }

    private tickBound(): BN {
        return new BN(443636)
    }
}