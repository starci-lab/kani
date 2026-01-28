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
import {
    envConfig 
} from "@modules/env"
import {
    AsyncService 
} from "@modules/mixin"
import {
    PaginateService,
    ValidateService,
} from "../../../services"
import {
    ExactlyTwoTokensRequiredException 
} from "@modules/exceptions"
import {
    PositionAssociateService 
} from "@modules/databases"
import {
    CacheKey, CacheService 
} from "@modules/cache"
import Decimal from "decimal.js"

@Injectable()
export class LiquidityPoolsService {
    constructor(
        private readonly memoryStorageService: PrimaryMemoryStorageService,
        private readonly positionAssociateService: PositionAssociateService,
        private readonly asyncService: AsyncService,
        private readonly validateService: ValidateService,
        private readonly paginateService: PaginateService,
        private readonly cacheService: CacheService,
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
        let liquidityPools = this.memoryStorageService
            .liquidityPoolCollection
            .chain()
            .find()
            .data(
                {
                    removeMeta: true,
                }
            )
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
                    throw new ExactlyTwoTokensRequiredException({
                        tokenIds,
                    })
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
        const promises: Array<Promise<void>> = []
        for (const liquidityPool of liquidityPools) {
            promises.push(
                (async () => {
                    const analytics = await this.cacheService.get(
                        {
                            key: CacheKey.PoolAnalytics,
                            args: [liquidityPool.id],
                        }
                    )
                    if (analytics) {
                        liquidityPool.analytics = {
                            fees24H: analytics.fee24H,
                            volume24H: analytics.volume24H,
                            tvl: analytics.tvl,
                            apr24H: analytics.apr24H,
                            liquidity: analytics.liquidity,
                        }
                    }
                })(),
            )
        }
        await this.asyncService.allIgnoreError(promises)
        // sort
        if (sortBy) {
            switch (sortBy) {
            case LiquidityPoolsSortBy.Apr: {
                liquidityPools = liquidityPools.sort(
                    (prev, next) =>
                        asc
                            ? new Decimal(prev.analytics?.apr24H ?? 0)
                                .sub(new Decimal(next.analytics?.apr24H ?? 0))
                                .toNumber()
                            : new Decimal(next.analytics?.apr24H ?? 0)
                                .sub(new Decimal(prev.analytics?.apr24H ?? 0))
                                .toNumber(),
                )
                break
            }
            case LiquidityPoolsSortBy.Volume: {
                liquidityPools = liquidityPools.sort(
                    (prev, next) =>
                        asc
                            ? new Decimal(prev.analytics?.volume24H ?? 0)
                                .sub(new Decimal(next.analytics?.volume24H ?? 0))
                                .toNumber()
                            : new Decimal(next.analytics?.volume24H ?? 0)
                                .sub(new Decimal(prev.analytics?.volume24H ?? 0))
                                .toNumber(),
                )
                break
            }
            case LiquidityPoolsSortBy.Fees: {
                liquidityPools = liquidityPools.sort(
                    (prev, next) =>
                        asc
                            ? new Decimal(prev.analytics?.fees24H ?? 0)
                                .sub(new Decimal(next.analytics?.fees24H ?? 0))
                                .toNumber()
                            : new Decimal(next.analytics?.fees24H ?? 0)
                                .sub(new Decimal(prev.analytics?.fees24H ?? 0))
                                .toNumber(),
                )
                break
            }
            case LiquidityPoolsSortBy.Liquidity: {
                liquidityPools = liquidityPools.sort(
                    (prev, next) =>
                        asc
                            ? new Decimal(prev.analytics?.liquidity ?? 0)
                                .sub(new Decimal(next.analytics?.liquidity ?? 0))
                                .toNumber()
                            : new Decimal(next.analytics?.liquidity ?? 0)
                                .sub(new Decimal(prev.analytics?.liquidity ?? 0))
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
