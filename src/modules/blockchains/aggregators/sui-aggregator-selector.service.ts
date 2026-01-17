import { Injectable } from "@nestjs/common"
import { AsyncService } from "@modules/mixin"
import { AggregatorNotFoundException } from "@exceptions"
import { ChainId } from "@typedefs"
import { AggregatorId } from "./types"
import { 
    BatchQuoteParams, 
    BatchQuoteResult, 
    IAggregatorSelectorService, 
    SelectorSwapParams, 
    SelectorSwapResult 
} from "./aggregator-selector.interface"
import { SevenKAggregatorService } from "./7k.service"
import { CetusAggregatorService } from "./cetus-aggregator.service"

@Injectable()
export class SuiAggregatorSelectorService implements IAggregatorSelectorService {
    constructor(
        private readonly cetusAggregatorService: CetusAggregatorService,
        private readonly sevenKService: SevenKAggregatorService,
        private readonly asyncService: AsyncService,
    ) { }

    async batchQuote(params: BatchQuoteParams): Promise<BatchQuoteResult> {
        const promises: Array<Promise<BatchQuoteResult>> = []
        // Cetus Aggregator
        if (
            this.cetusAggregatorService.supportedChains().includes(ChainId.Sui)) 
        {
            promises.push(
                (
                    async () => (
                        ({
                            response: await this.cetusAggregatorService.quote(params),
                            aggregatorId: AggregatorId.CetusAggregator,
                        })
                    )
                )()
            )
        }
        // SevenK
        if (
            this.sevenKService.supportedChains().includes(ChainId.Sui)) 
        {
            promises.push(
                (
                    async () => ({
                        response: await this.sevenKService.quote(params),
                        aggregatorId: AggregatorId.SevenK,
                    }
                    )
                )()
            )
        }
        // Execute + ignore errors
        const results = await this.asyncService.allIgnoreError(promises)
        // Remove null or undefined
        const filteredResults = results.filter(
            (filteredResult): filteredResult is BatchQuoteResult => filteredResult != null
        )
        if (filteredResults.length === 0) {
            throw new AggregatorNotFoundException("No aggregator found")
        }
        // Pick the best (largest amountOut)
        const best = filteredResults.reduce((filteredResultPrevious, filteredResultNext) =>
            filteredResultPrevious.response.amountOut.gt(filteredResultNext.response.amountOut) 
                ? filteredResultPrevious 
                : filteredResultNext
        )
        return best
    }

    async selectorSwap(
        params: SelectorSwapParams
    ): Promise<SelectorSwapResult> {
        switch (params.aggregatorId) {
        case AggregatorId.CetusAggregator: {
            return await this.cetusAggregatorService.swap(params.base)
        }
        case AggregatorId.SevenK: {
            return await this.sevenKService.swap(params.base)
        }
        default: {
            throw new AggregatorNotFoundException("Unsupported aggregator id")
        }
        }
    }
}   