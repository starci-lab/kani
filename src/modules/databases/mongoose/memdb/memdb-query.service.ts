import { Injectable } from "@nestjs/common"
import { MemDbService } from "./memdb.service"
import { DexId, LiquidityPoolId, LiquidityPoolSchema } from "@modules/databases"
import { Types } from "mongoose"

@Injectable()
export class MemDbQueryService {
    constructor(private readonly memDbService: MemDbService) {}

    public populateLiquidityPools(): Array<LiquidityPoolSchema> {
        return this.memDbService.liquidityPools.map((liquidityPool) => {
            // set the liquidity pool tokens
            liquidityPool.tokenA = this.memDbService.tokens.find(
                (token) => token.id.toString() === liquidityPool.tokenA.toString(),
            )!
            liquidityPool.tokenB = this.memDbService.tokens.find(
                (token) => token.id.toString() === liquidityPool.tokenB.toString(),
            )!
            liquidityPool.rewardTokens = liquidityPool.rewardTokens.map((rewardToken) => this.memDbService.tokens.find(
                (token) => token.id.toString() === rewardToken.toString(),
            )!)
            liquidityPool.dex = this.memDbService.dexes.find(
                (dex) => dex.id.toString() === liquidityPool.dex.toString(),
            )!
            return liquidityPool
        })
    }

    public findPoolsByDexId(dexId: DexId) {
        const dex = this.memDbService.dexes.find((dex) => dex.displayId === dexId)
        return this.populateLiquidityPools().filter(
            (liquidityPool) => liquidityPool.dex.toString() === dex?.id.toString(),
        )
    }

    public findLiquidityPoolsByIds(poolIds: Array<LiquidityPoolId>) {
        return this.populateLiquidityPools().filter((liquidityPool) =>
            poolIds.includes(liquidityPool.displayId),
        )
    }

    public findDexById(id: string | Types.ObjectId) {
        return this.memDbService.dexes.find(
            (dex) => dex.id.toString() === id.toString(),
        )
    }

    public findTokenById(tokenId: string | Types.ObjectId) {
        return this.memDbService.tokens.find(
            (token) => token.id.toString() === tokenId.toString(),
        )
    }

    public findLiquidityPoolById(poolId: string | Types.ObjectId) {
        return this.populateLiquidityPools().find(
            (liquidityPool) => liquidityPool.id.toString() === poolId.toString(),
        )
    }
}
