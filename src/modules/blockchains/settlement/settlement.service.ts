import {
    Injectable 
} from "@nestjs/common"
import {
    OutOfRangeSettlementService 
} from "./out-of-range-settlement.service"
import {
    SettleParams, 
    SettleStrategyResult
} from "./settlement.interface"

@Injectable()
export class SettlementService {
    constructor(
        private readonly outOfRangeSettlementService: OutOfRangeSettlementService,
    ) {}

    async settle(
        { 
            bot, 
            state,
            liquidityPool,
        }: SettleParams
    ): Promise<SettleResult> {
        const strategyResults: Array<SettleStrategyResult> = []
        // check if the position is out of range
        const outOfRangeSettleStrategyResult = await this.outOfRangeSettlementService.settle({
            bot, state, liquidityPool 
        })
        strategyResults.push(outOfRangeSettleStrategyResult)
        const settled = strategyResults.some(result => result.settled)
        return {
            settled,
            strategyResults,
        }
    }
}
    
export interface SettleResult {
    settled: boolean
    strategyResults: Array<SettleStrategyResult>
}