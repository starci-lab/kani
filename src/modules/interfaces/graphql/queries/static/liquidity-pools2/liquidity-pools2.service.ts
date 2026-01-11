import { Injectable } from "@nestjs/common"
import {
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    LiquidityPools2Request,
    LiquidityPools2ResponseData
} from "./liquidity-pools2.dto"
import { envConfig } from "@modules/env"
import Decimal from "decimal.js"
import {
    PaginationLimitOutOfRangeException
} from "@exceptions"
import { AsyncService } from "@modules/mixin"
import { AttachDynamicInfoService } from "../../../services"

@Injectable()
export class LiquidityPools2Service {
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly attachDynamicInfoService: AttachDynamicInfoService,
        private readonly asyncService: AsyncService,
    ) {}

    async liquidityPools2(
        { filters }: LiquidityPools2Request,
    ): Promise<LiquidityPools2ResponseData> {
        const {
            pageNumber = 1,
            limit = envConfig().pagination.limit.default,
            aprDescending = true,
            tokenA,
            tokenB,
            ids,
            displayIds,
            addresses
        } = filters
        // validate limits for the filters
        this.validateLimit(limit)
        this.validateLimit(ids?.length)
        this.validateLimit(displayIds?.length)
        this.validateLimit(addresses?.length)
        // get the liquidity pools
        const liquidityPools = this.memoryStorageService.liquidityPools
        // short-circuit filters
        let baseLiquidityPools =
            ids?.length
                ? liquidityPools.filter(liquidityPool => ids.includes(liquidityPool.id))
                : displayIds?.length
                    ? liquidityPools.filter(liquidityPool => displayIds.includes(liquidityPool.displayId))
                    : addresses?.length
                        ? liquidityPools.filter(liquidityPool => addresses.includes(liquidityPool.poolAddress))
                        : liquidityPools
        // token filters (only when not explicit ids)
        if (!ids?.length && !displayIds?.length && !addresses?.length) {
            if (tokenA) {
                baseLiquidityPools = baseLiquidityPools.filter(liquidityPool => liquidityPool.tokenA.toString() === tokenA.toString())
            }
            if (tokenB) {
                baseLiquidityPools = baseLiquidityPools.filter(liquidityPool => liquidityPool.tokenB.toString() === tokenB.toString())
            }
        }
        // pagination
        const paginatedLiquidityPools = this.paginate(baseLiquidityPools, pageNumber, limit)
        // attach dynamic info
        await this.asyncService.allIgnoreError(
            paginatedLiquidityPools.map(paginatedLiquidityPool => this.attachDynamicInfoService.attachDynamicInfo(paginatedLiquidityPool))
        )
        // sort
        if (aprDescending) {
            paginatedLiquidityPools.sort(
                (prev, next) => (next.dynamicInfo?.apr24H ?? 0) - (prev.dynamicInfo?.apr24H ?? 0)
            )
        }
        return {
            count: liquidityPools.length,
            data: paginatedLiquidityPools,
        }
    }

    // =========================
    // Helpers
    // =========================

    private validateLimit(limit: number | undefined) {
        if (!limit) {
            return
        }
        const { min, max } = envConfig().pagination.limit
        if (new Decimal(limit).lt(min) || new Decimal(limit).gt(max)) {
            throw new PaginationLimitOutOfRangeException(
                `Limit must be between ${min} and ${max}`
            )
        }
    }

    private paginate<T>(items: Array<T>, page: number, limit: number): Array<T> {
        const start = new Decimal(page).sub(1).mul(limit).toNumber()
        return items.slice(start, start + limit)
    }


}
