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

@Injectable()
export class SolanaAggregatorSelectorService implements IAggregatorSelectorService {
    constructor(
        private readonly jupiterService: JupiterService,
        private readonly asyncService: AsyncService,
    ) { }

    async batchQuote(params: BatchQuoteParams): Promise<BatchQuoteResult> {
        const promises: Array<Promise<BatchQuoteResult>> = []

        // Jupiter
        if (this.jupiterService.supportedChains().includes(ChainId.Solana)) {
            promises.push(
                (async () => ({
                    response: await this.jupiterService.quote(params),
                    aggregatorId: AggregatorId.Jupiter,
                }))()
            )
        }
        // Race the promises
        return await this.asyncService.raceValue(promises)      
    }

    async selectorSwap(
        params: SelectorSwapParams
    ): Promise<SelectorSwapResult> {
        switch (params.aggregatorId) {
        case AggregatorId.Jupiter: {
            return await this.jupiterService.swap(params.base)
        }
        default: {
            throw new AggregatorNotImplementedException({
                aggregatorId: params.aggregatorId,
            })
        }
        }
    }
}   
