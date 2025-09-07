import { Injectable } from "@nestjs/common"
import { MemDbService } from "./memdb.service"
import { DexId, LpPoolId } from "@modules/databases"

@Injectable()
export class MemDbQueryService {
    constructor(private readonly memDbService: MemDbService) {}

    public populateLpPools() {
        return this.memDbService.lpPools.map((lpPool) => {
            return {
                ...lpPool,
                tokenA: this.memDbService.tokens.find(
                    (token) => token.id.toString() === lpPool.tokenA.toString(),
                ),
                tokenB: this.memDbService.tokens.find(
                    (token) => token.id.toString() === lpPool.tokenB.toString(),
                ),
            }
        })
    }

    public findPoolsByDexId(dexId: DexId) {
        const dex = this.memDbService.dexes.find((dex) => dex.displayId === dexId)
        return this.populateLpPools().filter(
            (lpPool) => lpPool.dex.toString() === dex?.id.toString(),
        )
    }

    public findPoolsByIds(poolIds: Array<LpPoolId>) {
        return this.populateLpPools().filter((lpPool) => poolIds.includes(lpPool.displayId))
    }
}
