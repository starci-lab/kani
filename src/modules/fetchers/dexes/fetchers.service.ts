import { Inject, Injectable } from "@nestjs/common"
import { MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } from "./dexes.module-definition"
import { DexId } from "@modules/databases"
import { ChainId, Network } from "@modules/common"
import { ModuleRef } from "@nestjs/core"
import { LiquidityPoolService } from "@modules/blockchains"
import { DexNotFoundException } from "@exceptions"
import { CacheKey, CacheService, createCacheKey } from "@modules/cache"
import { InjectSuperJson } from "@modules/mixin"
import SuperJSON from "superjson"
import { Cron, CronExpression } from "@nestjs/schedule"

@Injectable()
export class DexesFetcherService {
    constructor(
        @Inject(MODULE_OPTIONS_TOKEN)
        private readonly options: typeof OPTIONS_TYPE,
        private readonly moduleRef: ModuleRef,
        private readonly liquidityPoolService: LiquidityPoolService,
        private readonly cacheService: CacheService,
        @InjectSuperJson()
        private readonly superjson: SuperJSON,
    ) { }

    @Cron(CronExpression.EVERY_5_SECONDS)
    async fetchPoolsByDexId(
        dexId: DexId,
        chainId: ChainId,
        network: Network,
    ) {
        const [ dex ] = this.liquidityPoolService.getDexs({
            dexIds: [dexId],
            chainId,
        })
        if (!dex) {
            throw new DexNotFoundException(dexId, "Dex not found in registered dexes")
        }
        const pools = await dex.fetcher.fetchPools({
            network
        })
        await this.cacheService.set({
            key: createCacheKey(CacheKey.LiquidityPools, { dexId, chainId, network }),
            value: this.superjson.stringify(pools),
        })  
    }
}   