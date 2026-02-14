import {
    PrimaryMemoryStorageService 
} from "@modules/databases"
import {
    Injectable 
} from "@nestjs/common"
import {
    LoadLiquidityPoolExecutionContextParams,
    LoadLiquidityPoolExecutionContextResult,
} from "../types"
import {
    LiquidityPoolNotFoundException,
} from "@modules/exceptions"
import {
    LiquidityPoolStateService 
} from "@modules/blockchains"
import {
    ExecutionContextService,
} from "./execution-context.service"

/**
 * Service responsible for building the execution context for a given job, bot, and liquidity pool.
 */
@Injectable()
export class LiquidityPoolExecutionContextService {
    constructor(    
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
        private readonly liquidityPoolStateService: LiquidityPoolStateService,
        private readonly executionContextService: ExecutionContextService,
    ) { }

    /**
     * Builds the execution context for a given job, bot, and liquidity pool.
     * @param params - The parameters for the execution context loading.
     * @returns The execution context.
     */
    async load(
        {
            jobId,
            botId,
            liquidityPoolId,
            state: _state,
        }: LoadLiquidityPoolExecutionContextParams
    ): Promise<LoadLiquidityPoolExecutionContextResult> {
        const {
            job,
            bot,
        } = await this.executionContextService.load(
            {
                jobId,
                botId,
            }
        )
        // Find the liquidity pool by id.
        const liquidityPool = this.primaryMemoryStorageService.liquidityPoolCollection.findOne({
            id: {
                $eq: liquidityPoolId,
            }
        })
        if (!liquidityPool) {
            throw new LiquidityPoolNotFoundException(
                {
                    id: liquidityPoolId,
                }
            )
        }
        // Get the state
        const state = _state ?? await this.liquidityPoolStateService.getState(liquidityPool)
        return {
            job,
            bot,
            liquidityPool,
            state,
        }
    }
}