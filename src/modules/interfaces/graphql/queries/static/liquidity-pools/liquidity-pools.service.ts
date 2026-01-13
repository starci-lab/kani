import { Injectable } from "@nestjs/common"
import { PrimaryMemoryStorageService } from "@modules/databases"
import {
    LiquidityPoolsRequest,
    LiquidityPoolsResponseData,
    LiquidityPoolsSortBy,
} from "./liquidity-pools.dto"
import { envConfig } from "@modules/env"
import { AsyncService } from "@modules/mixin"
import { AttachDynamicInfoService, PaginateService, ValidateService } from "../../../services"
import BN from "bn.js"

@Injectable()
export class LiquidityPoolsService {
    constructor(
    private readonly memoryStorageService: PrimaryMemoryStorageService,
    private readonly attachDynamicInfoService: AttachDynamicInfoService,
    private readonly asyncService: AsyncService,
    private readonly validateService: ValidateService,
    private readonly paginateService: PaginateService,
    ) {}

    async liquidityPools({
        filters,
    }: LiquidityPoolsRequest): Promise<LiquidityPoolsResponseData> {
        const {
            pageNumber = 1,
            limit = envConfig().pagination.liquidityPools.limit.default,
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
        this.validateService.validateLimit(
            { 
                limit: ids?.length, 
                min: envConfig().pagination.liquidityPools.limit.min, 
                max: envConfig().pagination.liquidityPools.limit.max 
            }
        )
        this.validateService.validateLimit(
            { 
                limit: displayIds?.length, 
                min: envConfig().pagination.liquidityPools.limit.min, 
                max: envConfig().pagination.liquidityPools.limit.max
            }
        )
        this.validateService.validateLimit(
            { 
                limit: addresses?.length, 
                min: envConfig().pagination.liquidityPools.limit.min, 
                max: envConfig().pagination.liquidityPools.limit.max
            }
        )
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
        let paginatedLiquidityPools = this.paginateService.paginate(
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
            case LiquidityPoolsSortBy.Apr: {
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
            case LiquidityPoolsSortBy.Volume: {
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
            case LiquidityPoolsSortBy.Fees: {
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
            case LiquidityPoolsSortBy.Liquidity: {
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
}
