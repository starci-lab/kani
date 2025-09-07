import { Injectable } from "@nestjs/common"
import { MemDbService } from "./memdb.service"
import { DexId, LiquidityPoolId } from "@modules/databases"
import { Types } from "mongoose"

@Injectable()
export class MemDbQueryService {
    constructor(private readonly memDbService: MemDbService) {}

    public populateLiquidityPools() {
        return this.memDbService.liquidityPools.map((liquidityPool) => {
            return {
                ...liquidityPool,
                tokenA: this.memDbService.tokens.find(
                    (token) => token.id.toString() === liquidityPool.tokenA.toString(),
                ),
                tokenB: this.memDbService.tokens.find(
                    (token) => token.id.toString() === liquidityPool.tokenB.toString(),
                ),
            }
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
