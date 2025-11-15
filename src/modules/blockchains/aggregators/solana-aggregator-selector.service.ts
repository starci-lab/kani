import { Injectable } from "@nestjs/common"
import { JupiterService } from "./jupiter.service"
import { QuoteRequest, QuoteResponse, SwapRequest, SwapResponse } from "./aggregator.interface"
import { AsyncService } from "@modules/mixin"
import { AggregatorNotFoundException } from "@exceptions"
import { ChainId } from "@modules/common"
import { AggregatorId } from "./types"

export type BatchQuoteParams = QuoteRequest

export interface BatchQuoteResponse {
    response: QuoteResponse
    aggregatorId: AggregatorId
}

export interface SelectorSwapParams {
    base: SwapRequest
    aggregatorId: AggregatorId
}

@Injectable()
export class SolanaAggregatorSelectorService {
    constructor(
        private readonly jupiterService: JupiterService,
        private readonly asyncService: AsyncService,
    ) { }

    async batchQuote(params: BatchQuoteParams): Promise<BatchQuoteResponse> {
        const promises: Array<Promise<BatchQuoteResponse>> = []

        // Jupiter
        if (this.jupiterService.supportedChains().includes(ChainId.Solana)) {
            promises.push(
                (async () => ({
                    response: await this.jupiterService.quote(params),
                    aggregatorId: AggregatorId.Jupiter,
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

    async selectorSwap(params: SelectorSwapParams): Promise<SwapResponse> {
        switch (params.aggregatorId) {
        case AggregatorId.Jupiter:
            return this.jupiterService.swap(params.base)
        default:
            throw new AggregatorNotFoundException("Aggregator not found")
        }
    }
}   

