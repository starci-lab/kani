import {
    Injectable
} from "@nestjs/common"
import {
    PrimaryMemoryStorageService
} from "@modules/databases"
import {
    LiquidityPoolsRequest,
    LiquidityPoolsResponseData,
    LiquidityPoolsSortBy,
} from "./liquidity-pools.dto"
import { envConfig } from "@modules/env"
import { AsyncService } from "@modules/mixin"
import {
    AttachDynamicInfoService,
    PaginateService,
    ValidateService,
} from "../../../services"
import BN from "bn.js"
import { OnlyTwoTokenIdsAllowedException } from "@exceptions"

@Injectable()
export class LiquidityPoolsService {
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly attachDynamicInfoService: AttachDynamicInfoService,
        private readonly asyncService: AsyncService,
        private readonly validateService: ValidateService,
        private readonly paginateService: PaginateService,
    ) { }

    async liquidityPools({
        filters,
    }: LiquidityPoolsRequest): Promise<LiquidityPoolsResponseData> {
        const {
            pageNumber = 1,
            limit = envConfig().pagination.liquidityPools.limit.default,
            tokenIds,
            ids,
            addresses,
            sortBy,
            asc = false,
            dexIds,
            incentivized,
            watchlist
        } = filters
        // require paginate
        const isRequiredPaginate = ids?.length || addresses?.length
        // get the liquidity pools
        let liquidityPools = this.memoryStorageService.liquidityPools
        // filter by dex ids
        if (dexIds?.length) {
            liquidityPools = liquidityPools.filter(
                (liquidityPool) =>
                    dexIds.includes(liquidityPool.dex.toString()),
            )
        }
        let count = 0
        // if required paginate, validate limits and get the liquidity pools
        if (isRequiredPaginate) {
            // validate limit for ids
            this.validateService.validateLimit(
                {
                    limit: ids?.length,
                    min: envConfig().pagination.liquidityPools.limit.min,
                    max: envConfig().pagination.liquidityPools.limit.max
                }
            )
            // validate limit for addresses
            this.validateService.validateLimit(
                {
                    limit: addresses?.length,
                    min: envConfig().pagination.liquidityPools.limit.min,
                    max: envConfig().pagination.liquidityPools.limit.max
                }
            )
            // filter by ids
            // if ids are provided, filter by ids
            if (ids?.length) {
                liquidityPools = liquidityPools.filter(
                    (liquidityPool) => ids.includes(liquidityPool.id)
                )
                // filter by addresses
            } else if (addresses?.length) {
                liquidityPools = liquidityPools.filter(
                    (liquidityPool) => addresses.includes(liquidityPool.poolAddress)
                )
            }
            count = liquidityPools.length
        } else {
            // filter by incentivized
            if (incentivized) {
                // filter by incentivized
            }
            // filter by watchlist
            if (watchlist) {
                // filter by watchlist
            }
            if (tokenIds?.length) {
                // if token ids are provided, filter by token ids
                // if the length > 2, throw an error
                if (tokenIds.length > 2) {
                    throw new OnlyTwoTokenIdsAllowedException("Only 2 token ids are allowed")
                }
                // if tokenIds length is 2, require both token ids to be present
                if (tokenIds.length === 2) {
                    liquidityPools = liquidityPools.filter((liquidityPool) =>
                        tokenIds.includes(liquidityPool.tokenA.toString()) &&
                        tokenIds.includes(liquidityPool.tokenB.toString())
                    )
                } else {
                    // if tokenIds length is 1, require either token id to be present
                    liquidityPools = liquidityPools.filter((liquidityPool) =>
                        tokenIds.includes(liquidityPool.tokenA.toString()) ||
                        tokenIds.includes(liquidityPool.tokenB.toString())
                    )
                }
                count = liquidityPools.length
                // pagination
                liquidityPools = this.paginateService.paginate(
                    liquidityPools,
                    pageNumber,
                    limit,
                )
            }
        }
        // attach dynamic info
        await this.asyncService.allIgnoreError(
            liquidityPools.map((liquidityPool) =>
                this.attachDynamicInfoService.attachDynamicInfo(liquidityPool),
            ),
        )
        // sort
        if (sortBy) {
            switch (sortBy) {
            case LiquidityPoolsSortBy.Apr: {
                liquidityPools = liquidityPools.sort(
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
                liquidityPools = liquidityPools.sort(
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
                liquidityPools = liquidityPools.sort(
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
                liquidityPools = liquidityPools.sort(
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

        return {
            count,
            data: liquidityPools,
        }
    }
}
