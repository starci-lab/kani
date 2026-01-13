import { Injectable } from "@nestjs/common"
import { PrimaryMemoryStorageService } from "@modules/databases"
import {
    LiquidityPools2Request,
    LiquidityPools2ResponseData,
    LiquidityPools2SortBy,
} from "./liquidity-pools2.dto"
import { envConfig } from "@modules/env"
import Decimal from "decimal.js"
import { PaginationLimitOutOfRangeException } from "@exceptions"
import { AsyncService } from "@modules/mixin"
import { AttachDynamicInfoService } from "../../../services"
import BN from "bn.js"

@Injectable()
export class LiquidityPools2Service {
    constructor(
    private readonly memoryStorageService: PrimaryMemoryStorageService,
    private readonly attachDynamicInfoService: AttachDynamicInfoService,
    private readonly asyncService: AsyncService,
    ) {}

    async liquidityPools2({
        filters,
    }: LiquidityPools2Request): Promise<LiquidityPools2ResponseData> {
        const {
            pageNumber = 1,
            limit = envConfig().pagination.liquidityPools2.limit.default,
            tokenIds,
            ids,
            displayIds,
            addresses,
            sortBy,
            asc = false,
            dexIds,
            incentivized,
            watchlist
        } = filters
        if (incentivized) {
            return {
                count: 0,
                data: [],
            }
        }
        if (watchlist) {
            return {
                count: 0,
                data: [],
            }
        }
        // validate limits for the filters
        this.validateLimit(limit)
        this.validateLimit(ids?.length)
        this.validateLimit(displayIds?.length)
        this.validateLimit(addresses?.length)
        // get the liquidity pools
        const liquidityPools = this.memoryStorageService.liquidityPools
        // short-circuit filters
        let baseLiquidityPools = ids?.length
            ? liquidityPools.filter((liquidityPool) => ids.includes(liquidityPool.id))
            : displayIds?.length
                ? liquidityPools.filter((liquidityPool) =>
                    displayIds.includes(liquidityPool.displayId),
                )
                : addresses?.length
                    ? liquidityPools.filter((liquidityPool) =>
                        addresses.includes(liquidityPool.poolAddress),
                    )
                    : liquidityPools
        // token filters (only when not explicit ids)
        if (!ids?.length && !displayIds?.length && !addresses?.length) {
            if (tokenIds?.length) {
                baseLiquidityPools = baseLiquidityPools.filter((liquidityPool) =>
                    tokenIds.includes(liquidityPool.tokenA.toString()) &&
                    tokenIds.includes(liquidityPool.tokenB.toString())
                )
            }
        }
        // pagination
        let paginatedLiquidityPools = this.paginate(
            baseLiquidityPools,
            pageNumber,
            limit,
        )
        // attach dynamic info
        await this.asyncService.allIgnoreError(
            paginatedLiquidityPools.map((paginatedLiquidityPool) =>
                this.attachDynamicInfoService.attachDynamicInfo(paginatedLiquidityPool),
            ),
        )
        // sort
        if (sortBy) {
            switch (sortBy) {
            case LiquidityPools2SortBy.Apr: {
                paginatedLiquidityPools = paginatedLiquidityPools.sort(
                    (prev, next) =>
                        asc
                            ? (prev.dynamicInfo?.apr24H ?? 0) -
                  (next.dynamicInfo?.apr24H ?? 0)
                            : (next.dynamicInfo?.apr24H ?? 0) -
                  (prev.dynamicInfo?.apr24H ?? 0),
                )
                break
            }
            case LiquidityPools2SortBy.Volume: {
                paginatedLiquidityPools = paginatedLiquidityPools.sort(
                    (prev, next) =>
                        asc
                            ? (prev.dynamicInfo?.volume24H ?? 0) -
                  (next.dynamicInfo?.volume24H ?? 0)
                            : (next.dynamicInfo?.volume24H ?? 0) -
                  (prev.dynamicInfo?.volume24H ?? 0),
                )
                break
            }
            case LiquidityPools2SortBy.Fees: {
                paginatedLiquidityPools = paginatedLiquidityPools.sort(
                    (prev, next) =>
                        asc
                            ? (prev.dynamicInfo?.fees24H ?? 0) -
                  (next.dynamicInfo?.fees24H ?? 0)
                            : (next.dynamicInfo?.fees24H ?? 0) -
                  (prev.dynamicInfo?.fees24H ?? 0),
                )
                break
            }
            case LiquidityPools2SortBy.Liquidity: {
                paginatedLiquidityPools = paginatedLiquidityPools.sort(
                    (prev, next) =>
                        asc
                            ? new BN(prev.dynamicInfo?.liquidity ?? 0)
                                .sub(new BN(next.dynamicInfo?.liquidity ?? 0))
                                .toNumber()
                            : new BN(next.dynamicInfo?.liquidity ?? 0)
                                .sub(new BN(prev.dynamicInfo?.liquidity ?? 0))
                                .toNumber(),
                )
                break
            }
            }
        }
        // filter by dex ids
        if (dexIds?.length) {
            paginatedLiquidityPools = paginatedLiquidityPools.filter(
                (liquidityPool) =>
                    dexIds.includes(liquidityPool.dex.toString()),
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
        const { min, max } = envConfig().pagination.liquidityPools2.limit
        if (new Decimal(limit).lt(min) || new Decimal(limit).gt(max)) {
            throw new PaginationLimitOutOfRangeException(
                `Limit must be between ${min} and ${max}`,
            )
        }
    }

    private paginate<T>(items: Array<T>, page: number, limit: number): Array<T> {
        const start = new Decimal(page).sub(1).mul(limit).toNumber()
        return items.slice(start, start + limit)
    }
}
