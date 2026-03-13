import {
    Injectable,
} from "@nestjs/common"
import {
    LiquidityPoolStateService
} from "./liquidity-pool-state.service"
import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    DayjsService
} from "@modules/mixin"
import {
    envConfig
} from "@modules/env"

@Injectable()
export class DynamicLiquidityPoolInfoDiagnosticService
{
    constructor(
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly dayjsService: DayjsService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
    ) {}
    /**
     * Ready.
     *
     * @param id - The liquidity pool id
     * @returns True if the liquidity pool is ready, false otherwise
     */
    async ready(id: string): Promise<boolean> {
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolMap.get(id)
        if (!liquidityPool) return false
        const state = await this.liquidityPoolStateService.getState(liquidityPool)
        if (state) {
            return this.dayjsService.now().diff(
                state.snapshotAt,
                "ms"
            ) <= envConfig().diagnostics.dynamicLiquidityPoolInfo.staleMs
        }
        return false
    }
}