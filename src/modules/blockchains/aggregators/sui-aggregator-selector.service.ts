import {
    Injectable 
} from "@nestjs/common"
import {
    AsyncService 
} from "@modules/mixin"
import {
    AggregatorNotImplementedException 
} from "@modules/exceptions"
import {
    ChainId 
} from "../enums"
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
import {
    SevenKAggregatorService 
} from "./7k.service"
import {
    CetusAggregatorService 
} from "./cetus-aggregator.service"

/**
 * Service responsible for selecting and coordinating Sui aggregators.
 * Handles batch quote requests and routes swaps to appropriate aggregators.
 *
 * @example
 * const service = new SuiAggregatorSelectorService(...)
 * const quote = await service.batchQuote({ tokenIn, tokenOut, amountIn, senderAddress })
 */
@Injectable()
export class SuiAggregatorSelectorService implements IAggregatorSelectorService {
    constructor(
        private readonly cetusAggregatorService: CetusAggregatorService,
        private readonly sevenKService: SevenKAggregatorService,
        private readonly asyncService: AsyncService,
    ) { }

    /**
     * Requests quotes from all supported Sui aggregators in parallel and returns the fastest result.
     *
     * @param param - Batch quote parameters
     * @returns Fastest quote result from available aggregators
     *
     * @example
     * const quote = await service.batchQuote({ tokenIn, tokenOut, amountIn, senderAddress })
     */
    async batchQuote(params: BatchQuoteParams): Promise<BatchQuoteResult> {
        const promises: Array<Promise<BatchQuoteResult>> = []
        
        // add Cetus Aggregator quote request if supported
        if (this.cetusAggregatorService.supportedChains().includes(ChainId.Sui)) {
            promises.push(
                (async () => ({
                    response: await this.cetusAggregatorService.quote(params),
                    aggregatorId: AggregatorId.CetusAggregator,
                }))()
            )
        }
        
        // add SevenK quote request if supported
        if (this.sevenKService.supportedChains().includes(ChainId.Sui)) {
            promises.push(
                (async () => ({
                    response: await this.sevenKService.quote(params),
                    aggregatorId: AggregatorId.SevenK,
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
     * const result = await service.selectorSwap({ aggregatorId: AggregatorId.SevenK, base: swapParams })
     */
    async selectorSwap({ aggregatorId, base }: SelectorSwapParams): Promise<SelectorSwapResult> {
        switch (aggregatorId) {
        case AggregatorId.CetusAggregator: {
            return await this.cetusAggregatorService.swap(base)
        }
        case AggregatorId.SevenK: {
            return await this.sevenKService.swap(base)
        }
        default: {
            throw new AggregatorNotImplementedException(
                {
                    aggregatorId,
                }
            )
        }
        }
    }
}   