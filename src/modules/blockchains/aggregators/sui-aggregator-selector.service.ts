import { Injectable } from "@nestjs/common"
import { AsyncService, LoadBalancerService } from "@modules/mixin"
import { AggregatorNotFoundException } from "@exceptions"
import { ChainId } from "@typedefs"
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
import { SuiClient } from "@mysten/sui/client"
import { PrimaryMemoryStorageService, LoadBalancerName } from "@modules/databases"
@Injectable()
export class SuiAggregatorSelectorService implements IAggregatorSelectorService {
    constructor(
        private readonly cetusAggregatorService: CetusAggregatorService,
        private readonly sevenKService: SevenKAggregatorService,
        private readonly asyncService: AsyncService,
        private readonly loadBalancerService: LoadBalancerService,
        private readonly primaryMemoryStorageService: PrimaryMemoryStorageService,
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
            const { payload, outputCoin, txb } = await this.cetusAggregatorService.swap(params.base)
            return {
                payload,
                outputCoin,
                txb,
            }
        }
        case AggregatorId.SevenK: {
            const { payload, outputCoin, txb } = await this.sevenKService.swap(params.base)
            return {
                payload,
                outputCoin,
                txb,
            }
        }
        default:
            throw new AggregatorNotFoundException("Aggregator not found")
        }
    }

    async getSuiRpc(
        { aggregatorId }: GetSuiRpcParams
    ): Promise<GetSuiRpcResponse> {
        switch (aggregatorId) {
        case AggregatorId.CetusAggregator: {
            const url = this.loadBalancerService.balanceP2c(
                LoadBalancerName.CetusAggregator,
                this.primaryMemoryStorageService.clientConfig.cetusAggregatorClientRpcs.write
            )
            return {
                client: new SuiClient({
                    url,
                    network: "mainnet",
                }),
            }
        }
        case AggregatorId.SevenK: {
            const url = this.loadBalancerService.balanceP2c(
                LoadBalancerName.SevenKAggregator,
                this.primaryMemoryStorageService.clientConfig.sevenKAggregatorClientRpcs.write
            )
            return {
                client: new SuiClient({
                    url,
                    network: "mainnet",
                }),
            }
        }
        default:
            throw new AggregatorNotFoundException("Aggregator not found")
        }
    }
}   

export interface GetSuiRpcParams {
    aggregatorId: AggregatorId
}

export interface GetSuiRpcResponse {
    client: SuiClient
}