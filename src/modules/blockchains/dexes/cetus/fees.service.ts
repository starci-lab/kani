import { FeesParams, FeesResponse, IFeesService } from "../../interfaces"
import { Injectable } from "@nestjs/common"
import { RpcExecutorService } from "../../clients"
import {
    ActivePositionNotFoundException,
} from "@exceptions"

import BN from "bn.js"
import { LiquidityPoolState } from "../../interfaces"
import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import { computeDenomination } from "@utils"
import { DayjsService } from "@modules/mixin"
import { RpcAccessType } from "@modules/filesystem"
import Decimal from "decimal.js"
import fs from "fs"
import { tickIndexToPrice } from "@orca-so/whirlpools-core"

@Injectable()
export class CetusFeesService implements IFeesService {
    constructor(
    private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    private readonly rpcExecutorService: RpcExecutorService,
    private readonly dayyjsService: DayjsService,
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
        const priceLower = tickIndexToPrice(tickLower.toNumber(), 6, 6)
        const priceUpper = tickIndexToPrice(tickUpper.toNumber(), 6, 6)
        console.log(priceLower.toString(), priceUpper.toString())
        //try get the tick
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
        const tickLowerData = parseCetusSuiDynamicFieldObjectResponse(tickLowerData)
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
        return {
            snapshotAt: this.dayyjsService.now(),
            tokenA: computeDenomination(new BN(0), 6),
            tokenB: computeDenomination(new BN(0), 6),
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
            return feeGrowthOutsideLower.sub(feeGrowthOutsideUpper)
        }

        if (currentTick.greaterThanOrEqualTo(tickUpper)) {
            return feeGrowthOutsideUpper.sub(feeGrowthOutsideLower)
        }

        return feeGrowthGlobal
            .sub(feeGrowthOutsideLower)
            .sub(feeGrowthOutsideUpper)
    }

    // fun tick_score(tick: I32): u64 {
    //     let t = i32::as_u32(i32::add(tick, i32::from(tick_math::tick_bound())));
    //     assert!((t >= 0) && (t <= (tick_math::tick_bound() * 2)), EInvalidTick);
    //     (t as u64)
    // }
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
}