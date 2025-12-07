import { Injectable } from "@nestjs/common"
import { JupiterService } from "./jupiter.service"
import { AsyncService } from "@modules/mixin"
import { LoadBalancerName } from "@modules/databases"
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
import { Rpc, SolanaRpcApi, RpcSubscriptions, SolanaRpcSubscriptionsApi } from "@solana/kit"

@Injectable()
export class SolanaAggregatorSelectorService implements IAggregatorSelectorService {
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

    async selectorSwap(
        params: SelectorSwapParams
    ): Promise<SelectorSwapResponse> {
        switch (params.aggregatorId) {
        case AggregatorId.Jupiter: {
            const { payload } = await this.jupiterService.swap(params.base)
            return {
                payload,
            }
        }
        default:
            throw new AggregatorNotFoundException("Aggregator not found")
        }
    }

    aggregatorIdToLoadBalancerName(
        aggregatorId: AggregatorId
    ): LoadBalancerName {
        switch (aggregatorId) {
        case AggregatorId.Jupiter: {
            return LoadBalancerName.JupiterAggregator
        }
        default:
            throw new AggregatorNotFoundException("Aggregator not found")
        }
    }
}   

export interface GetSolanaRpcsParams {
    aggregatorId: AggregatorId
}

export interface GetSolanaRpcsResponse {
    rpc: Rpc<SolanaRpcApi>
    rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>
}
