import {
    PrimaryMemoryStorageService,
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"
import {
    LoadLiquidityPoolContextParams, LoadLiquidityPoolContextResult 
} from "./types"
import {
    LiquidityPoolStateService 
} from "@modules/blockchains"
import {
    LiquidityPoolNotFoundException,
} from "@modules/exceptions"

/**
 * Service responsible for building the execution context for a given job, bot, and liquidity pool.
 */
@Injectable()
export class LiquidityPoolContextService {
    constructor(
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
    ) { }

    /**
     * Builds the execution context for a given job, bot, and liquidity pool.
     * @param params - The parameters for the execution context loading.
     * @returns The execution context.
     */
    async load(
        {
            liquidityPoolId,
        }: LoadLiquidityPoolContextParams
    ): Promise<LoadLiquidityPoolContextResult> {
        // Find the job by id.
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolMap.get(liquidityPoolId)
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException({
                id: liquidityPoolId,
            })
        }
        return {
            liquidityPool,
            state: await this.liquidityPoolStateService.getState(liquidityPool),
        }
    }
}