import {
    Injectable 
} from "@nestjs/common"
import {
    JupiterService 
} from "./jupiter.service"
import {
    AsyncService 
} from "@modules/mixin"
import {
    AggregatorNotImplementedException
} from "@modules/exceptions"
import {
    ChainId 
} from "@modules/common"
import {
    AggregatorId 
} from "./enums"
import { 
    BatchQuoteParams, 
    BatchQuoteResult, 
    IAggregatorSelectorService, 
    SelectorSwapParams, 
    SelectorSwapResult 
} from "./types"

/**
 * Service responsible for selecting and coordinating Solana aggregators.
 * Handles batch quote requests and routes swaps to appropriate aggregators.
 *
 * @example
 * const service = new SolanaAggregatorSelectorService(...)
 * const quote = await service.batchQuote({ tokenIn, tokenOut, amountIn, senderAddress })
 */
@Injectable()
export class SolanaAggregatorSelectorService implements IAggregatorSelectorService {
    constructor(
        private readonly jupiterService: JupiterService,
        private readonly asyncService: AsyncService,
    ) { }

    /**
     * Requests quotes from all supported Solana aggregators in parallel and returns the fastest result.
     *
     * @param param - Batch quote parameters
     * @returns Fastest quote result from available aggregators
     *
     * @example
     * const quote = await service.batchQuote({ tokenIn, tokenOut, amountIn, senderAddress })
     */
    async batchQuote(params: BatchQuoteParams): Promise<BatchQuoteResult> {
        const promises: Array<Promise<BatchQuoteResult>> = []
        // add Jupiter quote request if supported
        if (this.jupiterService.supportedChains().includes(ChainId.Solana)) {
            promises.push(
                (async () => ({
                    response: await this.jupiterService.quote(params),
                    aggregatorId: AggregatorId.Jupiter,
                }))()
            )
        }
        
        // race all promises and return fastest result
        return await this.asyncService.raceValue(promises)      
    }

    /**
     * Executes a swap using the specified aggregator.
     *
     * @param param - Selector swap parameters
     * @returns Swap result from the selected aggregator
     *
     * @example
     * const result = await service.selectorSwap({ aggregatorId: AggregatorId.Jupiter, base: swapParams })
     */
    async selectorSwap({ aggregatorId, base }: SelectorSwapParams): Promise<SelectorSwapResult> {
        switch (aggregatorId) {
        case AggregatorId.Jupiter: {
            return await this.jupiterService.swap(base)
        }
        default: {
            throw new AggregatorNotImplementedException({
                aggregatorId,
            })
        }
        }
    }
}   
