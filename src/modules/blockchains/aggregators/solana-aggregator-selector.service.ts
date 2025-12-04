import { Injectable } from "@nestjs/common"
import { JupiterService } from "./jupiter.service"
import { AsyncService, LoadBalancerService } from "@modules/mixin"
import { LoadBalancerName, PrimaryMemoryStorageService } from "@modules/databases"
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
import { Rpc, SolanaRpcApi, RpcSubscriptions, createSolanaRpcSubscriptions, createSolanaRpc, SolanaRpcSubscriptionsApi } from "@solana/kit"
import { httpsToWss } from "@utils"

@Injectable()
export class SolanaAggregatorSelectorService implements IAggregatorSelectorService {
    constructor(
        private readonly loadBalancerService: LoadBalancerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
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

    async getSolanaRpcs(
        { aggregatorId }: GetSolanaRpcsParams
    ): Promise<GetSolanaRpcsResponse> {
        switch (aggregatorId) {
        case AggregatorId.Jupiter: {
            const url = this.loadBalancerService.balanceP2c(
                LoadBalancerName.JupiterAggregator,
                this.primaryMemoryStorageService.clientConfig.jupiterAggregatorClientRpcs.write
            )
            return {
                rpc: createSolanaRpc(url),
                rpcSubscriptions: createSolanaRpcSubscriptions(httpsToWss(url)),
            }
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
