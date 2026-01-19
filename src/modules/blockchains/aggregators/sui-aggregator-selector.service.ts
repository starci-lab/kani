import {
    Injectable 
} from "@nestjs/common"
import {
    AsyncService 
} from "@modules/mixin"
import {
    AggregatorAllQuotesFailedException,
    AggregatorNotImplementedException 
} from "@modules/exceptions"
import {
    ChainId 
} from "@modules/typedefs"
import {
    AggregatorId 
} from "@modules/typedefs"
import { 
    BatchQuoteParams, 
    BatchQuoteResult, 
    IAggregatorSelectorService, 
    SelectorSwapParams, 
    SelectorSwapResult 
} from "./aggregator-selector.interface"
import {
    SevenKAggregatorService 
} from "./7k.service"
import {
    CetusAggregatorService 
} from "./cetus-aggregator.service"

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
            (r): r is BatchQuoteResult => r != null
        )
        if (filteredResults.length === 0) {
            throw new AggregatorAllQuotesFailedException({
                aggregatorIds: results.map((r): AggregatorId => r?.aggregatorId ?? AggregatorId.CetusAggregator),
            })
        }
        // Pick the best (largest amountOut)
        const best = filteredResults.reduce((a, b) =>
            a.response.amountOut.gt(b.response.amountOut) ? a : b
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
            throw new AggregatorNotImplementedException({
                aggregatorId: params.aggregatorId,
            })
        }
        }
    }
}   