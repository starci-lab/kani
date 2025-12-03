import { Injectable } from "@nestjs/common"
import { AsyncService } from "@modules/mixin"
import { AggregatorNotFoundException } from "@exceptions"
import { ChainId } from "@modules/common"
import { AggregatorId } from "./types"
import { 
    BatchQuoteParams, 
    BatchQuoteResponse, 
    IAggregatorSelectorService, 
    SelectorSwapParams, 
    SelectorSwapResponse 
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

    async batchQuote(params: BatchQuoteParams): Promise<BatchQuoteResponse> {
        const promises: Array<Promise<BatchQuoteResponse>> = []

        // Cetus Aggregator
        if (this.cetusAggregatorService.supportedChains().includes(ChainId.Sui)) {
            promises.push(
                (async () => ({
                    response: await this.cetusAggregatorService.quote(params),
                    aggregatorId: AggregatorId.CetusAggregator,
                }))()
            )
        }
        // SevenK
        if (this.sevenKService.supportedChains().includes(ChainId.Sui)) {
            promises.push(
                (async () => ({
                    response: await this.sevenKService.quote(params),
                    aggregatorId: AggregatorId.SevenK,
                }))()
            )
        }
        // Execute + ignore errors
        const results = await this.asyncService.allIgnoreError(promises)
        // Remove null or undefined
        const filteredResults = results.filter(
            (r): r is BatchQuoteResponse => r != null
        )
        if (filteredResults.length === 0) {
            throw new AggregatorNotFoundException("No aggregator found")
        }
        // Pick the best (largest amountOut)
        const best = filteredResults.reduce((a, b) =>
            a.response.amountOut.gt(b.response.amountOut) ? a : b
        )
        return best
    }

    async selectorSwap(
        params: SelectorSwapParams
    ): Promise<SelectorSwapResponse> {
        switch (params.aggregatorId) {
        case AggregatorId.CetusAggregator: {
            const { payload } = await this.cetusAggregatorService.swap(params.base)
            return {
                payload,
            }
        }
        case AggregatorId.SevenK: {
            const { payload } = await this.sevenKService.swap(params.base)
            return {
                payload,
            }
        }
        default:
            throw new AggregatorNotFoundException("Aggregator not found")
        }
    }
}   

