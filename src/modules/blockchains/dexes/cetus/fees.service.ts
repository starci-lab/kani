import { FeesParams, FeesResponse, IFeesService } from "../../interfaces"
import { Injectable } from "@nestjs/common"
import { RpcExecutorService } from "../../clients"
import {
    SuiObjectDataNotFoundException,
} from "@exceptions"

import BN from "bn.js"
import { LiquidityPoolState } from "../../interfaces"
import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import { computeDenomination, Q128, Q64 } from "@utils"
import { DayjsService } from "@modules/mixin"
import { RpcAccessType } from "@modules/filesystem"
import Decimal from "decimal.js"
import { CetusSuiObjectTickFields, CetusSuiSkipListNodeFields, parseCetusTick } from "./struct"
import { SuiMoveObjectData } from "../../structs"
import fs from "fs"
import { ClmmRewardsFormulaService } from "../../formulas"

@Injectable()
export class CetusFeesService implements IFeesService {
    constructor(
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly rpcExecutorService: RpcExecutorService,
    private readonly dayyjsService: DayjsService,
    private readonly clmmRewardsFormulaService: ClmmRewardsFormulaService,
    ) {}

    async fees({ bot, state }: FeesParams): Promise<FeesResponse> {
        const _state = state as LiquidityPoolState
        // if (!bot.activePosition) {
        //     throw new ActivePositionNotFoundException("Active position not found")
        // }

        // const positionId = bot.activePosition.positionId
        // const tickLower = bot.activePosition.tickLower ?? 0
        // const tickUpper = bot.activePosition.tickUpper ?? 0
        const positionId = "0xd2abe2ea0c6f2b18a09692d1f703e9491db817ff0c14bb9830c05cc0b9794bd6"
        const tickLower = new Decimal(59200)
        const tickUpper = new Decimal(68780)
        const lowerScore = this.tickScore(tickLower)
        const upperScore = this.tickScore(tickUpper)

        //try get the tick
        const object = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getObject({
                    id: "0x51e883ba7c0b566a26cbc8a94cd33eb0abd418a77cc1e60ad22fd9b1f29cd2ab",
                    options: {
                        showContent: true,
                    },
                })
            },
        })
        fs.writeFileSync("object.json", JSON.stringify(object, null, 2))
        const { data: tickLowerData } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: "0x7f07284d6d6373a1b32d8f721991c3c17aa2f895abcc34e0d5990a8a99aaf2ae",
                    name: {
                        type: "u64",
                        value: lowerScore.toString(),
                    },
                })
            },
        })
        if (!tickLowerData) {
            throw new SuiObjectDataNotFoundException("Tick lower data not found")
        }
        const _tickLowerData = tickLowerData as unknown as SuiMoveObjectData<
        CetusSuiSkipListNodeFields<CetusSuiObjectTickFields
        , `${string}::tick::Tick`
        >>
        const cetusTickLower = parseCetusTick(_tickLowerData.content.fields.value.fields.value.fields)
        const { data: tickUpperData } = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: "0x7f07284d6d6373a1b32d8f721991c3c17aa2f895abcc34e0d5990a8a99aaf2ae",
                    name: {
                        type: "u64",
                        value: upperScore.toString(),
                    },
                })
            },
        })
        if (!tickUpperData) {
            throw new SuiObjectDataNotFoundException("Tick upper data not found")
        }
        const _tickUpperData = tickUpperData as unknown as SuiMoveObjectData<
        CetusSuiSkipListNodeFields<
        CetusSuiObjectTickFields, 
        `${string}::tick::Tick`
        >>
        const cetusTickUpper = parseCetusTick(_tickUpperData.content.fields.value.fields.value.fields)
        const feeGrowthInsideA = this.computeFeeGrowthInside(
            _state.dynamic.feeGrowthGlobalA,
            new BN(cetusTickLower.feeGrowthOutsideA.toString()),
            new BN(cetusTickUpper.feeGrowthOutsideA.toString()),
            new Decimal(new BN(_state.dynamic.tickCurrent).toString()),
            tickLower,
            tickUpper,
        )
        const feeGrowthInsideB = this.computeFeeGrowthInside(
            _state.dynamic.feeGrowthGlobalB,
            new BN(cetusTickLower.feeGrowthOutsideB.toString()),
            new BN(cetusTickUpper.feeGrowthOutsideB.toString()),
            new Decimal(new BN(_state.dynamic.tickCurrent).toString()),
            tickLower,
            tickUpper,
        )
        // ----------------------------
        // Position checkpoint
        // ----------------------------
        // ----------------------------
        // Fee calculation (WRAPPED)
        // ----------------------------
        const x = await this.rpcExecutorService.withSuiClient({
            accessType: RpcAccessType.Http,
            callback: async ({ suiClient }) => {
                return suiClient.getDynamicFieldObject({
                    parentId: "0x0bad9ea1bcb68c4ac3eb71819639360906392047f5fcd1675902cbb84d6157e8",
                    name: {
                        type: "0x2::object::ID",
                        value: positionId,
                    },
                })
            },
        })
        fs.writeFileSync("x.json", JSON.stringify(x, null, 2))
        // {
        //     "fee_growth_inside_a": "1307261945981327",
        //     "fee_growth_inside_b": "719599275427530854",
        //     "fee_owned_a": "0",
        //     "fee_owned_b": "0",
        //     "liquidity": "2378743",
        //     "points_growth_inside": "31392782673851868",
        //     "points_owned": "0",
        //     "position_id": "0xd2abe2ea0c6f2b18a09692d1f703e9491db817ff0c14bb9830c05cc0b9794bd6",
        //     "rewards": [
        //       {
        //         "type": "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::position::PositionReward",
        //         "fields": {
        //           "amount_owned": "0",
        //           "growth_inside": "7266847841189848530"
        //         }
        //       }
        //     ],

        const feeGrowthInsideALastX64 = new BN(
            "1307261945981327",
        )
        const feeGrowthInsideBLastX64 = new BN(
            "719599275427530854",
        )
        const feeGrowthDeltaA = this.subQ128(
            feeGrowthInsideA,
            feeGrowthInsideALastX64,
        )

        const feeGrowthDeltaB = this.subQ128(
            feeGrowthInsideB,
            feeGrowthInsideBLastX64,
        )
        const liquidity = new BN("2378743")
        const feeEarnedA = liquidity.mul(feeGrowthDeltaA).div(Q64)
        const feeEarnedB = liquidity.mul(feeGrowthDeltaB).div(Q64)

        console.log(
            {
                rewardGrowthGlobal: new BN(_state.dynamic.rewards[0].growthGlobal.toString()).toString(),
                rewardGrowthOutsideLower: new BN(cetusTickLower.feeGrowthOutsideA.toString()).toString(),
                rewardGrowthOutsideUpper: new BN(cetusTickUpper.feeGrowthOutsideA.toString()).toString(),
                currentTick: new Decimal(new BN(_state.dynamic.tickCurrent).toString()).toString(),
                tickLower: tickLower.toString(),
                tickUpper: tickUpper.toString(),
                rewardGrowthInsideLast: new BN("7266847841189848530").toString(),
                liquidity: liquidity.toString(),
                rewardOwned: new BN("0").toString(),
                wrapModulus: Q64.toString(),
            }
        )
        const totalReward = this.clmmRewardsFormulaService.computeTotalReward(
            {
                rewardGrowthGlobal: new BN("335255938512901042076"),
                rewardGrowthOutsideLower: new BN(cetusTickLower.rewardsGrowthOutside[0].toString()),
                rewardGrowthOutsideUpper: new BN(cetusTickUpper.rewardsGrowthOutside[0].toString()),
                currentTick: new Decimal(new BN(_state.dynamic.tickCurrent).toString()),
                tickLower,
                tickUpper,
                rewardGrowthInsideLast: new BN("7266847841189848530"),
                liquidity,
                rewardOwned: new BN("0"),
                insideDeltaWrapModulus: Q128,
                outsideDeltaWrapModulus: Q128,
                resultDiv: Q64,
            }
        )
        console.log(`totalReward: ${totalReward.toString()}`)
        return {
            snapshotAt: _state.dynamic.snapshotAt,
            tokenA: computeDenomination(feeEarnedA, 6, 6),
            tokenB: computeDenomination(feeEarnedB, 9, 9),
        }
    }

    computeFeeGrowthInside(
        feeGrowthGlobal: BN,
        feeGrowthOutsideLower: BN,
        feeGrowthOutsideUpper: BN,
        currentTick: Decimal,
        tickLower: Decimal,
        tickUpper: Decimal,
    ): BN {
        if (currentTick.lessThan(tickLower)) {
            return feeGrowthOutsideLower
                .sub(feeGrowthOutsideUpper)
                .umod(Q128)
        }
      
        if (currentTick.greaterThanOrEqualTo(tickUpper)) {
            return feeGrowthOutsideUpper
                .sub(feeGrowthOutsideLower)
                .umod(Q128)
        }
      
        return feeGrowthGlobal
            .sub(feeGrowthOutsideLower)
            .sub(feeGrowthOutsideUpper)
            .umod(Q128)
    }

    private tickScore(tick: Decimal): Decimal {
        const tickScore = new Decimal(tick).add(this.tickBound())
        if (tickScore.lessThan(0) || tickScore.greaterThan(this.tickBound().mul(2))) {
            throw new Error("Invalid tick")
        }
        return tickScore
    }

    private tickBound(): Decimal {
        return new Decimal(443636)
    }

    private subQ128(a: BN, b: BN): BN {
        return a.sub(b).umod(Q128)
    }
}